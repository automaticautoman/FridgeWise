// Checks everything the reset-code email needs, one step at a time, and says
// exactly what's wrong. Reads the same env files as the dev server.
//
//   npm run check:email -- you@example.com              (real project, .env.local)
//   npm run check:email -- you@example.com --mode emulator
import { loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const modeIdx = args.indexOf('--mode');
const mode = modeIdx >= 0 ? args[modeIdx + 1] : 'development';
const to = args.find((a, i) => !a.startsWith('--') && (modeIdx < 0 || i !== modeIdx + 1));

const root = fileURLToPath(new URL('..', import.meta.url));
const env = loadEnv(mode, root, '');
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;

let failed = false;
const ok = (m) => console.log('  OK   ' + m);
const bad = (m, fix) => { failed = true; console.log('  FAIL ' + m + (fix ? '\n       -> ' + fix : '')); };

console.log(`\nFridgeWise email check (mode: ${mode})\n`);
const emulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
console.log(`  Accounts are looked up in: ${emulator ? 'the Auth emulator at ' + process.env.FIREBASE_AUTH_EMULATOR_HOST : 'your real Firebase project'}`);

// 1. Server secrets
if (!emulator) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) bad('FIREBASE_SERVICE_ACCOUNT is empty', 'Firebase console > Project settings > Service accounts > Generate new private key, paste the JSON on one line in .env.local');
  else {
    try {
      const sa = JSON.parse(raw);
      ok(`service account for project "${sa.project_id}"`);
      if (process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_PROJECT_ID !== sa.project_id) {
        bad(`VITE_FIREBASE_PROJECT_ID is "${process.env.VITE_FIREBASE_PROJECT_ID}" but the service account is for "${sa.project_id}"`,
          'They must be the same project, or the server will never find accounts made in the app');
      }
    } catch { bad('FIREBASE_SERVICE_ACCOUNT is not valid JSON', 'Paste the whole downloaded JSON on ONE line, wrapped in single quotes'); }
  }
  if (!process.env.OTP_SECRET) bad('OTP_SECRET is empty', `Set it to a long random string, e.g. ${(await import('node:crypto')).randomBytes(32).toString('hex')}`);
  else ok('OTP_SECRET is set');
}

// 2. Firebase Auth + Firestore (the "database")
if (!failed) {
  try {
    const { adminAuth, adminDb } = await import('../api/_lib/admin.js');
    if (to) {
      try { const u = await adminAuth().getUserByEmail(to.toLowerCase()); ok(`account found for ${to} (uid ${u.uid})`); }
      catch (err) {
        if (err.code === 'auth/user-not-found') console.log(`  NOTE no FridgeWise account for ${to} yet. Reset codes only go to accounts that exist, so sign up with it first`);
        else throw err;
      }
    }
    if (process.env.OTP_STORE === 'memory') ok('codes stored in memory (local only)');
    else {
      const ref = adminDb().collection('passwordResetOtps').doc('_healthcheck');
      await ref.set({ at: new Date() }); await ref.delete();
      ok('Firestore read/write works');
    }
  } catch (err) {
    const msg = String(err.message || err);
    if (/NOT_FOUND|5 NOT_FOUND/.test(msg)) bad('Firestore database not found', 'Firebase console > Firestore Database > Create database');
    else if (/PERMISSION_DENIED|7 PERMISSION_DENIED/.test(msg)) bad('Firestore access denied: ' + msg, 'Use a key from Project settings > Service accounts (Firebase Admin SDK)');
    else if (/ECONNREFUSED/.test(msg)) bad('cannot reach the emulator: ' + msg, 'Start it first: npm run emulators (or npm run emulators:auth)');
    else bad('Firebase error: ' + msg);
  }
}

// 3. SMTP
if (!process.env.SMTP_HOST) {
  if (emulator) console.log('  INFO no SMTP_HOST: codes are printed in the dev server terminal, not emailed');
  else bad('SMTP_HOST is empty', 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env.local (see .env.example)');
} else {
  try {
    const { getTransport, mailFrom } = await import('../api/_lib/mailer.js');
    const t = getTransport();
    await t.verify();
    ok(`SMTP login to ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465} as ${process.env.SMTP_USER}`);
    if (to) {
      const info = await t.sendMail({ from: mailFrom(), to, subject: 'FridgeWise test email', text: 'If you can read this, FridgeWise can send reset codes.' });
      ok(`test email sent to ${to} (${info.response}). Check spam/promotions if it isn't in the inbox`);
    }
  } catch (err) {
    const msg = String(err.message || err);
    if (/535|Username and Password not accepted|Invalid login/i.test(msg)) bad('SMTP login rejected: ' + msg,
      'For Gmail, SMTP_PASS must be a 16-letter app password from myaccount.google.com/apppasswords (needs 2-Step Verification), not your normal password. SMTP_USER must be the full Gmail address');
    else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|Greeting never received/i.test(msg)) bad('cannot reach SMTP server: ' + msg,
      'Check SMTP_HOST/SMTP_PORT. Some networks block 465; try SMTP_PORT=587');
    else bad('SMTP error: ' + msg);
  }
}

console.log(failed ? '\nSomething needs fixing (see FAIL lines above).\n' : '\nAll good.\n');
process.exit(failed ? 1 : 0);
