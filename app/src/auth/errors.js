// Turns Firebase error codes into friendly copy.
// Sign-in errors never say which field was wrong, so they don't reveal
// whether an email has an account.
export function friendlyError(err, context = 'general') {
  const code = err && err.code ? err.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      if (context === 'reauth') return "That's not your current password.";
      return "Hmm, that email and password don't match.";
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Try signing in instead.';
    case 'auth/invalid-email':
      return "That doesn't look like an email address.";
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'Pick a stronger password: 8+ characters with a letter and a number.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes and try again, or reset your password.';
    case 'auth/network-request-failed':
      return "You're offline. Connect to the internet and try again.";
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null; // The person closed the Google window on purpose.
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email already signs in another way. Use email and password, then add Google later.';
    // Password reset codes (api/otp/)
    case 'otp/invalid-email':
      return "That doesn't look like an email address.";
    case 'otp/invalid-code':
      return "That code isn't right, or it has expired. Check your email and try again.";
    case 'otp/too-many-attempts':
      return 'Too many wrong codes. Ask for a new code and try again.';
    case 'otp/too-soon':
      return 'We just sent a code. Wait a moment before asking for another.';
    case 'otp/too-many-requests':
      return 'Too many tries. Wait a few minutes and try again.';
    case 'otp/session-expired':
      return 'This reset took too long. Start again to get a new code.';
    case 'otp/weak-password':
      return 'Pick a stronger password: 8+ characters with a letter and a number.';
    case 'otp/bad-request':
      return 'Something went wrong. Please try again.';
    case 'otp/send-failed':
      return "We couldn't send the email just now. Please try again in a minute.";
    // Kitchens (api/kitchens.js)
    case 'auth/not-signed-in':
      return 'Please sign in again to continue.';
    case 'kitchen/invalid-name':
      return 'Give the kitchen a name (up to 40 characters).';
    case 'kitchen/invalid-locations':
      return 'Each storage spot needs a name (up to 24 characters), and you can have up to 8.';
    case 'kitchen/too-many-kitchens':
      return "You're in the most kitchens you can be in. Leave one to add another.";
    case 'kitchen/not-found':
      return "That kitchen isn't available. You may have left it or been removed.";
    case 'kitchen/owner-only':
      return 'Only the kitchen owner can do that.';
    case 'kitchen/invites-owner-only':
      return 'Only the owner can invite people to this kitchen.';
    case 'kitchen/private':
      return 'Private kitchens are just for you, so they have no invite code.';
    case 'kitchen/too-many-codes':
      return "You've made a lot of new codes. Wait a bit before making another.";
    case 'kitchen/bad-code':
      return "That code isn't working. It may have expired or been typed wrong. Check it, or ask whoever invited you for a new one.";
    case 'kitchen/too-many-tries':
      return 'Too many wrong codes. Wait 10 minutes and try again.';
    case 'kitchen/full':
      return 'This kitchen is full.';
    case 'kitchen/transfer-first':
      return "You're the owner, so pick someone to take over before you leave.";
    case 'kitchen/invalid-email':
      return "That doesn't look like an email address.";
    case 'kitchen/too-many-emails':
      return "You've sent a lot of invite emails. Wait a bit, or share the link instead.";
    case 'kitchen/email-failed':
      return "We couldn't send that email just now. Share the link or code instead.";
    case 'kitchen/not-a-member':
      return "That person isn't in this kitchen any more.";
    case 'auth/credential-already-in-use':
    case 'auth/provider-already-linked':
      return 'This account already has a password.';
    case 'auth/requires-recent-login':
      return 'For your safety, please sign in again and retry.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
