// Checks that .env.local is set up correctly for the real Firebase project.
// Usage: npm run check:firebase
// Prints only yes/no results and project ids, never keys or passwords.
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
Object.assign(process.env, loadEnv('development', root, ''));

const ok = (msg) => console.log('  OK    ' + msg);
const bad = (msg) => console.log('  FIX   ' + msg);
let problems = 0;
const fail = (msg) => { problems++; bad(msg); };

console.log('\nFridgeWise Firebase check\n');

// 1. Browser keys
const browserKeys = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID'];
const missing = browserKeys.filter((k) => !process.env[k]);
if (missing.length) fail('Missing in .env.local: ' + missing.join(', '));
else ok('Browser keys present (project ' + process.env.VITE_FIREBASE_PROJECT_ID + ')');
if (process.env.VITE_USE_EMULATORS === 'true') fail('VITE_USE_EMULATORS is true; set it to false to use the real project');

// 2. Service account
let account;
try {
  account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
  if (account.project_id !== process.env.VITE_FIREBASE_PROJECT_ID) {
    fail('FIREBASE_SERVICE_ACCOUNT is for project ' + account.project_id + ', not ' + process.env.VITE_FIREBASE_PROJECT_ID);
  } else ok('Service account key is for the same project');
} catch {
  fail('FIREBASE_SERVICE_ACCOUNT is missing or not valid JSON');
}
if ((process.env.OTP_SECRET || '').length >= 32) ok('OTP_SECRET set');
else fail('OTP_SECRET missing or too short');

// 3. Live checks against Firebase
if (account) {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp({ credential: cert(account) });

  try {
    const res = await getAuth(app).listUsers(1);
    ok('Authentication reachable (' + (res.users.length ? 'has users' : 'no users yet') + ')');
  } catch (err) {
    fail('Authentication: ' + (err.code || err.message) + ' (is Authentication turned on?)');
  }

  try {
    await getFirestore(app).collection('_setupCheck').limit(1).get();
    ok('Firestore database exists');
  } catch (err) {
    const msg = String(err.message || err);
    fail('Firestore: ' + (/NOT_FOUND|does not exist/i.test(msg) ? 'database not created yet (Databases & Storage > Firestore > Create database)' : msg.split('\n')[0]));
  }
}

// 4. Email
if (!process.env.SMTP_HOST) {
  fail('SMTP_HOST is off, so reset codes cannot be emailed. Fill SMTP_USER, SMTP_PASS, MAIL_FROM and remove the # before SMTP_HOST');
} else if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  fail('SMTP_HOST is set but SMTP_USER or SMTP_PASS is empty');
} else {
  try {
    const nodemailer = (await import('nodemailer')).default;
    const port = Number(process.env.SMTP_PORT || 465);
    const pass = /gmail\.com$/i.test(process.env.SMTP_HOST) ? process.env.SMTP_PASS.replace(/\s+/g, '') : process.env.SMTP_PASS;
    await nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass } }).verify();
    ok('Email login works (' + process.env.SMTP_HOST + ')');
  } catch (err) {
    fail('Email login failed: ' + (err.response || err.message) + '. For Gmail, SMTP_PASS must be an app password');
  }
}

console.log(problems ? `\n${problems} thing(s) to fix.\n` : '\nAll good.\n');
process.exit(problems ? 1 : 0);
