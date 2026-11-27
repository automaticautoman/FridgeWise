// End-to-end check of every Epic 1 flow against the Firebase Auth emulator.
// Run with: npm run test:e2e   (starts the Auth emulator and a dev server)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const PORT = process.env.E2E_PORT || '5174';
const BASE = 'http://localhost:' + PORT;
const AUTH_EMU = 'http://127.0.0.1:9099';
const PROJECT = 'demo-fridgewise';
const SHOTS = process.env.E2E_SHOTS || 'tests/e2e/screenshots';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const results = [];
function check(name, ok, detail = '') {
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok || !detail ? '' : '  -> ' + detail));
  if (!ok) failures++;
}

async function waitFor(url, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(url); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('Timed out waiting for ' + url);
}

// Reads the latest reset code from the emulator-only dev outbox.
async function resetCodeFor(email) {
  const r = await fetch(`${BASE}/api/otp/dev-outbox?email=${encodeURIComponent(email)}`);
  return r.ok ? (await r.json()).code : null;
}

const server = spawn('npx', ['vite', '--mode', 'emulator-nojava', '--port', PORT, '--strictPort'], {
  env: { ...process.env, VITE_USE_EMULATORS: 'true', E2E_FAKE_FIRESTORE: 'true', OTP_STORE: 'memory', OTP_DEV_OUTBOX: 'true', SMTP_HOST: '', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' },
  stdio: 'ignore',
  shell: process.platform === 'win32'
});

try {
  await waitFor(BASE);
  await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
  const atPath = async (p) => { await page.waitForURL((u) => u.pathname === p, { timeout: 10000 }); return true; };
  const tryStep = async (name, fn) => {
    try { await fn(); } catch (err) { check(name, false, err.message.split('\n')[0]); }
  };

  // Signed-out visitors are sent to sign in.
  await tryStep('guard: /home redirects to /signin when signed out', async () => {
    await page.goto(BASE + '/home');
    await atPath('/signin');
    check('guard: /home redirects to /signin when signed out', true);
  });
  await shot('01-sign-in');

  // F01 sign up with password rules.
  await tryStep('F01 sign up', async () => {
    await page.click('text=Create an account');
    await atPath('/signup');
    await page.fill('#name', 'Sara Khan');
    await page.fill('#email', 'sara@example.com');
    await page.fill('#password', 'fridge7');
    check('F01 weak password keeps Create account disabled', await page.isDisabled('button:has-text("Create account")'));
    await shot('02-sign-up-weak-password');
    await page.fill('#password', 'chaiTime2026');
    check('F01 strong password enables Create account', await page.isEnabled('button:has-text("Create account")'));
    await page.click('button:has-text("Create account")');
    await atPath('/verify-email');
    check('F01 sign up asks to confirm the email with a code', true);
    await shot('02b-confirm-email');
    // Codes from the dev outbox are the same for reset and sign-up.
    let signupCode = null;
    for (let i = 0; i < 20 && !signupCode; i++) { signupCode = await resetCodeFor('sara@example.com'); if (!signupCode) await new Promise((r) => setTimeout(r, 250)); }
    await page.fill('#code', '000000');
    await page.click('button:has-text("Confirm email")');
    await page.waitForSelector('#verify-error');
    check('F01 wrong sign-up code is refused', true);
    await page.fill('#code', signupCode);
    await page.click('button:has-text("Confirm email")');
    await atPath('/onboarding');
    check('F01 right code confirms the email and opens onboarding', true);
  });

  // F05 onboarding.
  await tryStep('F05 onboarding', async () => {
    await page.waitForSelector('text=Hey Sara! Where do you cook?');
    check('F05 onboarding greets by first name', true);
    check('F05 Continue disabled until a kitchen choice', await page.isDisabled('button:has-text("Continue")'));
    await page.click('text=Start a shared kitchen');
    await shot('03-onboarding-kitchen');
    await page.click('button:has-text("Continue")');
    await page.waitForSelector('text=A nudge before food goes off');
    check('F05 explains notifications before asking', true);
    await shot('04-onboarding-notifications');
    await page.click('button:has-text("Not now")');
    await page.waitForSelector('text=Any food preferences?');
    await page.click('button.pill:has-text("Halal")');
    await page.click('button.pill:has-text("Peanuts")');
    await shot('05-onboarding-food');
    await page.click('button:has-text("Finish")');
    await atPath('/home');
    await page.waitForSelector('text=Hi Sara!');
    check('F05 onboarding finishes on Home', true);
    await shot('06-home');
  });

  // F02 stays signed in across reloads.
  await tryStep('F02 session persists after reload', async () => {
    await page.reload();
    await page.waitForSelector('text=Hi Sara!');
    check('F02 session persists after reload', true);
  });

  // Signed-in users can't open sign-in.
  await tryStep('guard: /signin redirects signed-in users home', async () => {
    await page.goto(BASE + '/signin');
    await atPath('/home');
    check('guard: /signin redirects signed-in users home', true);
  });

  // Saved preferences show up in Settings.
  await tryStep('F05 preferences saved to profile', async () => {
    await page.goto(BASE + '/settings');
    await page.waitForSelector('text=Halal, No peanuts');
    check('F05 preferences saved to profile', true);
  });

  // F04 change password.
  await tryStep('F04 change password', async () => {
    await page.click('text=Change password');
    await atPath('/settings/password');
    await page.fill('#current-password', 'wrongPass1');
    await page.fill('#new-password', 'mangoKettle9');
    await page.fill('#confirm-password', 'mangoKettle8');
    await page.waitForSelector("text=Passwords don't match yet");
    check('F04 mismatch keeps Save disabled', await page.isDisabled('button:has-text("Save password")'));
    await shot('07-change-password-mismatch');
    await page.fill('#confirm-password', 'mangoKettle9');
    await page.click('button:has-text("Save password")');
    await page.waitForSelector("text=That's not your current password.");
    check('F04 wrong current password is rejected', true);
    await page.fill('#current-password', 'chaiTime2026');
    await page.click('button:has-text("Save password")');
    await page.waitForSelector('text=Password changed.');
    check('F04 correct current password changes it', true);
    await shot('08-change-password-done');
  });

  // Offline: still signed in, banner shows.
  await tryStep('F02 offline keeps session', async () => {
    await context.setOffline(true);
    await page.click('nav[aria-label="Main"] >> text=Home');
    await page.waitForSelector("text=You're offline");
    await page.waitForSelector('text=Hi Sara!');
    check('F02 offline: still signed in, offline banner shows', true);
    await shot('09-offline');
    await context.setOffline(false);
  });

  // Sign out, then F02 sign in errors and success.
  await tryStep('F02 sign in', async () => {
    await page.click('button:has-text("Sign out")');
    await atPath('/signin');
    await page.fill('#email', 'sara@example.com');
    await page.fill('#password', 'chaiTime2026');
    await page.click('button[type=submit]');
    await page.waitForSelector("text=that email and password don't match");
    check("F02 old password fails with a message that doesn't say which field", true);
    await shot('10-sign-in-error');
    await page.fill('#email', 'nobody@example.com');
    await page.click('button[type=submit]');
    await page.waitForSelector("text=that email and password don't match");
    check('F02 unknown email gets the same message (no account enumeration)', true);
    await page.fill('#email', 'sara@example.com');
    await page.fill('#password', 'mangoKettle9');
    await page.click('button[type=submit]');
    await atPath('/home');
    check('F02 new password signs in and skips finished onboarding', true);
    await page.click('button:has-text("Sign out")');
    await atPath('/signin');
  });

  // F03 reset with an emailed 6-digit code.
  await tryStep('F03 reset', async () => {
    await page.click('text=Forgot password?');
    await atPath('/forgot-password');
    await page.fill('#email', 'nobody@example.com');
    await page.click('button:has-text("Send code")');
    await atPath('/reset/code');
    check('F03 unknown email still shows the neutral "Check your email" screen', true);
    check('F03 unknown email gets no code', !(await resetCodeFor('nobody@example.com')));
    await page.goto(BASE + '/forgot-password');
    await page.fill('#email', 'sara@example.com');
    await page.click('button:has-text("Send code")');
    await atPath('/reset/code');
    await page.waitForSelector('text=If an account exists for');
    await shot('11-enter-code');
    const code = await resetCodeFor('sara@example.com');
    check('F03 reset code was sent', !!code);
    await page.fill('#code', code === '000000' ? '111111' : '000000');
    await page.click('button:has-text("Verify code")');
    await page.waitForSelector("text=That code isn't right");
    check('F03 a wrong code is rejected', true);
    await page.fill('#code', code);
    await page.click('button:has-text("Verify code")');
    await atPath('/reset/new');
    await page.waitForSelector('text=Code verified for sara@example.com');
    await page.fill('#new-password', 'rooftopTea4');
    await page.fill('#confirm-password', 'rooftopTea4');
    await shot('12-set-new-password');
    await page.click('button:has-text("Save password")');
    await atPath('/reset-done');
    await shot('13-password-updated');
    check('F03 code sets a new password', true);
    const reuse = await fetch(BASE + '/api/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sara@example.com', code }) });
    check('F03 a used code is rejected', reuse.status === 400);
    await page.goto(BASE + '/signin');
    await page.fill('#email', 'sara@example.com');
    await page.fill('#password', 'rooftopTea4');
    await page.click('button[type=submit]');
    await atPath('/home');
    check('F03 sign in with the reset password works', true);
    await page.click('button:has-text("Sign out")');
    await atPath('/signin');
  });

  // Google sign-in through the emulator's fake popup, then F04 Google variant.
  await tryStep('Google sign-in', async () => {
    // The real Google popup needs Google's servers, so the test signs in a
    // Google account through the emulator instead (same app code after that).
    await page.waitForFunction(() => !!window.__fwTest);
    await page.evaluate(() => window.__fwTest.googleSignIn({ sub: 'ali-google-1', email: 'ali@gmail.com', email_verified: true, name: 'Ali Raza' }));
    await atPath('/onboarding');
    check('Google sign-up creates a profile and opens onboarding', true);
    await page.click('text=Join a kitchen');
    await page.click('button:has-text("Continue")');
    await page.click('button:has-text("Not now")');
    await page.click('button:has-text("Skip")');
    await atPath('/home');
    await page.goto(BASE + '/settings/password');
    await page.waitForSelector('text=You sign in with Google');
    check('F04 Google-only account sees the Google variant', true);
    await shot('15-google-variant');
    await page.click('button:has-text("Add a password")');
    await page.fill('#new-password', 'samosaNight5');
    await page.fill('#confirm-password', 'samosaNight5');
    await page.click('button:has-text("Save password")');
    try { await page.waitForSelector('#current-password', { timeout: 8000 }); }
    catch (e) { await shot('debug-add-password'); console.log('BODY:', (await page.textContent('main')).slice(0, 600)); throw e; }
    check('F04 Google account can add a password', true);
    await page.click('button:has-text("Sign out")');
    await page.fill('#email', 'ali@gmail.com');
    await page.fill('#password', 'samosaNight5');
    await page.click('button[type=submit]');
    await atPath('/home');
    check('F04 the added password signs in', true);
  });

  await browser.close();
} catch (err) {
  check('run', false, err.message);
} finally {
  server.kill();
}

console.log(results.join('\n'));
console.log(`\n${results.length - failures} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
