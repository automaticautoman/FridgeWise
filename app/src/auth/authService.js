import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as updateAuthProfile,
  signOut as fbSignOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  linkWithCredential
} from 'firebase/auth';
import { auth } from '../firebase';
import { createProfile, ensureProfile, signupState } from '../lib/profile';

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: 'select_account' });

// F01: create an individual account with name, email and password.
export async function signUpWithEmail({ name, email, password }) {
  signupState.inProgress = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateAuthProfile(cred.user, { displayName: name.trim() });
    await createProfile(cred.user, name.trim());
    return cred.user;
  } finally {
    signupState.inProgress = false;
  }
}

// F02: sign in. The session is persisted by firebase.js.
export async function signInWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

// F01 / F02 with Google. First-time Google users get a profile too.
export async function continueWithGoogle() {
  signupState.inProgress = true;
  try {
    const cred = await signInWithPopup(auth, google);
    await ensureProfile(cred.user);
    return cred.user;
  } finally {
    signupState.inProgress = false;
  }
}

export function signOut() {
  return fbSignOut(auth);
}

// F03: password reset with a 6-digit email code, handled by our own server
// functions in api/otp/. Errors carry a `code` like Firebase errors do, so
// friendlyError() handles both.
async function otpApi(step, body) {
  let res;
  try {
    res = await fetch('/api/otp/' + step, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    const err = new Error('offline'); err.code = 'auth/network-request-failed'; throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'otp/server-error');
    err.code = data.error || 'otp/server-error';
    err.retryAfter = data.retryAfter;
    throw err;
  }
  return data;
}

// Unknown emails get the same reply, so the screen never reveals whether an account exists.
export function requestPasswordReset(email) {
  return otpApi('request', { email: email.trim() });
}

// Resolves to a one-time token that allows setting the new password.
export async function verifyResetCode(email, code) {
  const { resetToken } = await otpApi('verify', { email, code });
  return resetToken;
}

export function finishPasswordReset(email, resetToken, password) {
  return otpApi('reset', { email, resetToken, password });
}

// Sign-up email verification (api/otp/email.js). The server reads the email
// from the signed-in user's ID token, so only the account owner can use it.
async function signupCodeApi(body) {
  const user = auth.currentUser;
  if (!user) { const err = new Error('auth/not-signed-in'); err.code = 'auth/not-signed-in'; throw err; }
  let res;
  try {
    res = await fetch('/api/otp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
      body: JSON.stringify(body)
    });
  } catch {
    const err = new Error('offline'); err.code = 'auth/network-request-failed'; throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'otp/server-error');
    err.code = data.error || 'otp/server-error';
    err.retryAfter = data.retryAfter;
    throw err;
  }
  return data;
}

export function sendSignupCode() {
  return signupCodeApi({ action: 'send' });
}

// On success the account is marked verified; reload so the app sees it.
export async function checkSignupCode(code) {
  await signupCodeApi({ action: 'check', code });
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true);
}

// Email-and-password accounts must confirm their email with a code before
// using the app. Google accounts come verified by Google.
export function needsEmailCode(user) {
  return !!user && !user.emailVerified && hasPasswordProvider(user);
}

export function hasPasswordProvider(user) {
  return !!user && user.providerData.some((p) => p.providerId === 'password');
}

export function hasGoogleProvider(user) {
  return !!user && user.providerData.some((p) => p.providerId === 'google.com');
}

// F04: change password after confirming the current one.
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
}

// F04 variant: Google-only accounts can add a FridgeWise password.
export async function addPasswordToGoogleAccount(newPassword) {
  const run = async () => {
    const user = auth.currentUser;
    try {
      await linkWithCredential(user, EmailAuthProvider.credential(user.email, newPassword));
    } catch (err) {
      // Some backends report the account's own email as "already in use"
      // when linking. Setting a password on the same account adds email
      // sign-in in that case.
      if (err.code !== 'auth/email-already-in-use') throw err;
      await updatePassword(user, newPassword);
    }
    await user.reload();
  };
  try {
    await run();
  } catch (err) {
    if (err.code !== 'auth/requires-recent-login') throw err;
    await reauthenticateWithPopup(auth.currentUser, google);
    await run();
  }
}

// Emulator-only test hook: lets the automated end-to-end test sign in a
// Google account without the real Google popup. Never present in production.
if (import.meta.env.VITE_USE_EMULATORS === 'true' && typeof window !== 'undefined') {
  window.__fwTest = {
    async googleSignIn(profile) {
      const { signInWithCredential } = await import('firebase/auth');
      signupState.inProgress = true;
      try {
        const cred = await signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify(profile)));
        await ensureProfile(cred.user);
      } finally {
        signupState.inProgress = false;
      }
    }
  };
}
