// Emulator-only: returns the latest code "sent" to an email, so the
// automated test can read it. 404 unless both emulator mode and
// OTP_DEV_OUTBOX=true are set, so it can't run in production.
import { devOutbox } from '../_lib/mailer.js';
import { normalize } from '../_lib/otp.js';

export default function handler(req, res) {
  if (process.env.OTP_DEV_OUTBOX !== 'true' || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return res.status(404).json({ error: 'not-found' });
  }
  const email = normalize(req.query && req.query.email);
  const mine = devOutbox().filter((m) => m.to === email);
  if (!mine.length) return res.status(404).json({ error: 'no-code' });
  return res.status(200).json({ code: mine[mine.length - 1].code });
}
