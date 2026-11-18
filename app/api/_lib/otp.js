// F03 with a 6-digit email code instead of a link.
//
// 1. request: email a code (if the account exists). Same reply either way,
//    so the screen never reveals whether an email has an account.
// 2. verify:  check the code. On success, hand back a one-time reset token.
// 3. reset:   use the token to set the new password, then sign out other devices.
//
// Only HMAC hashes of codes and tokens are stored, never the values.
import crypto from 'node:crypto';
import { adminAuth } from './admin.js';
import { getStore } from './store.js';
import { sendOtpEmail } from './mailer.js';
import { isEmail, isStrongEnough } from '../../src/lib/passwordRules.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
export const CODE_MINUTES = 10;
const RESEND_COOLDOWN = 60 * 1000;   // matches the 60-second timer on screen
const MAX_SENDS_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;              // wrong codes before a new one is needed
const TOKEN_TTL = 10 * MINUTE;       // time to pick a new password after verifying
const IP_LIMIT_PER_HOUR = 30;

function secret() {
  if (process.env.OTP_SECRET) return process.env.OTP_SECRET;
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return 'dev-only-otp-secret';
  throw new Error('OTP_SECRET is not set');
}
const hmac = (...parts) => crypto.createHmac('sha256', secret()).update(parts.join('\n')).digest('hex');
const sameHash = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length
  && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
export const normalize = (email) => String(email || '').trim().toLowerCase();
// Documents are keyed by a hash so plain email addresses aren't used as ids.
const keyFor = (email) => hmac('key', email);

// Best-effort per-IP limit. Per-instance on Vercel; the per-email limits in
// the store are the main protection.
const ipHits = new Map();
function ipAllowed(ip, now) {
  if (!ip) return true;
  const recent = (ipHits.get(ip) || []).filter((t) => now - t < HOUR);
  const ok = recent.length < IP_LIMIT_PER_HOUR;
  if (ok) recent.push(now);
  ipHits.set(ip, recent);
  return ok;
}

const fail = (status, error, extra = {}) => ({ status, body: { error, ...extra } });

// Explains silent outcomes in the terminal during local development.
// Never on Vercel, so production logs don't collect email addresses.
const devLog = (msg) => { if (!process.env.VERCEL) console.log('[otp] ' + msg); };
function projectLabel() {
  try { return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}').project_id || '(unknown)'; } catch { return '(unknown)'; }
}

export async function requestCode({ email }, { ip } = {}) {
  const e = normalize(email);
  if (!isEmail(e)) return fail(400, 'otp/invalid-email');
  const now = Date.now();
  if (!ipAllowed(ip, now)) return fail(429, 'otp/too-many-requests');

  let user = null;
  try { user = await adminAuth().getUserByEmail(e); } catch (err) { if (err.code !== 'auth/user-not-found') throw err; }
  const code = user ? String(crypto.randomInt(0, 1000000)).padStart(6, '0') : null;

  // Unknown emails get a record too, so limits and replies look identical.
  const wait = await getStore().update(keyFor(e), (cur) => {
    const sends = ((cur && cur.sends) || []).filter((t) => now - t < HOUR);
    const last = sends[sends.length - 1];
    if (last && now - last < RESEND_COOLDOWN) return { result: Math.ceil((RESEND_COOLDOWN - (now - last)) / 1000) };
    if (sends.length >= MAX_SENDS_PER_HOUR) return { result: Math.ceil((HOUR - (now - sends[0])) / 1000) };
    return {
      next: {
        sends: [...sends, now],
        codeHash: code ? hmac('code', e, code) : null,
        codeExpiresAt: now + CODE_MINUTES * MINUTE,
        attempts: 0,
        tokenHash: null,
        tokenExpiresAt: 0,
        expireAt: new Date(now + HOUR) // optional Firestore TTL policy field
      },
      result: 0
    };
  });
  if (wait) {
    devLog(`code for ${e} not sent: one was sent ${wait}s ago (wait for the timer).`);
    return fail(429, 'otp/too-soon', { retryAfter: wait });
  }

  if (!code) {
    // The reply stays the same so the screen doesn't reveal which emails have
    // accounts, but say why in the server log so it's easy to debug.
    devLog(`no account for ${e} in ${process.env.FIREBASE_AUTH_EMULATOR_HOST ? 'the Auth emulator' : 'Firebase project ' + projectLabel()}, so no email was sent.`
      + ' Sign up with this email first (in the same mode the server is running in).');
  } else {
    try { await sendOtpEmail(e, code, CODE_MINUTES); } catch (err) {
      console.error('[otp] email failed:', err.message);
      // Undo this send so the person can retry straight away. Otherwise the
      // 60-second cooldown would send them to "check your email" for an
      // email that never went out.
      await getStore().update(keyFor(e), (cur) => cur
        ? { next: { ...cur, sends: (cur.sends || []).filter((t) => t !== now), codeHash: null }, result: null }
        : { result: null });
      return fail(502, 'otp/send-failed');
    }
  }
  return { status: 200, body: { ok: true, resendAfter: RESEND_COOLDOWN / 1000, expiresInMinutes: CODE_MINUTES } };
}

export async function verifyCode({ email, code }) {
  const e = normalize(email);
  const c = String(code || '').replace(/\D/g, '');
  if (!isEmail(e) || c.length !== 6) return fail(400, 'otp/invalid-code');
  const now = Date.now();
  const token = crypto.randomBytes(32).toString('hex');

  const outcome = await getStore().update(keyFor(e), (cur) => {
    if (!cur) return { result: 'otp/invalid-code' };
    if (cur.attempts >= MAX_ATTEMPTS) return { result: 'otp/too-many-attempts' };
    const good = cur.codeHash && now <= cur.codeExpiresAt && sameHash(cur.codeHash, hmac('code', e, c));
    if (!good) {
      const attempts = cur.attempts + 1;
      return { next: { ...cur, attempts }, result: attempts >= MAX_ATTEMPTS ? 'otp/too-many-attempts' : 'otp/invalid-code' };
    }
    // A code works once: swap it for a short-lived reset token.
    return { next: { ...cur, codeHash: null, attempts: 0, tokenHash: hmac('token', e, token), tokenExpiresAt: now + TOKEN_TTL }, result: 'ok' };
  });
  if (outcome !== 'ok') return fail(400, outcome);
  return { status: 200, body: { resetToken: token } };
}

export async function resetPassword({ email, resetToken, password }) {
  const e = normalize(email);
  if (typeof password !== 'string' || password.length > 128 || !isStrongEnough(password)) return fail(400, 'otp/weak-password');
  if (!isEmail(e) || typeof resetToken !== 'string' || !/^[0-9a-f]{64}$/.test(resetToken)) return fail(400, 'otp/session-expired');
  const now = Date.now();

  const ok = await getStore().update(keyFor(e), (cur) => {
    if (!cur || !cur.tokenHash || now > cur.tokenExpiresAt || !sameHash(cur.tokenHash, hmac('token', e, resetToken))) return { result: false };
    return { next: { ...cur, tokenHash: null, tokenExpiresAt: 0 }, result: true };
  });
  if (!ok) return fail(400, 'otp/session-expired');

  const auth = adminAuth();
  const user = await auth.getUserByEmail(e);
  await auth.updateUser(user.uid, { password });
  await auth.revokeRefreshTokens(user.uid); // other devices must sign in again
  return { status: 200, body: { ok: true } };
}
