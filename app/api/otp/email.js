// Sign-up email verification: { action: 'send' } emails a 6-digit code,
// { action: 'check', code } checks it. Needs the user's Firebase ID token.
import { postHandler } from '../_lib/http.js';
import { signupCodeStep } from '../_lib/otp.js';

export default postHandler(signupCodeStep);
