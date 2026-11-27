import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { ErrorAlert, SubmitButton } from '../components/ui';
import { MailIcon, ClockIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthProvider';
import { sendSignupCode, checkSignupCode, needsEmailCode, signOut } from '../auth/authService';
import { friendlyError } from '../auth/errors';

const RESEND_SECONDS = 60;

// Sign-up step 2: confirm the email with a 6-digit code before using the app.
// A code is emailed automatically when this screen opens.
export default function VerifyEmail() {
  const { user, loading, refreshUser } = useAuth();
  const [deadline, setDeadline] = useState(() => Date.now() + RESEND_SECONDS * 1000);
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState('');
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'verify' | 'resend'
  const sentOnce = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Send the first code as soon as the screen opens. If one was sent less
  // than a minute ago (say after a refresh), keep using that one.
  useEffect(() => {
    if (!needsEmailCode(user) || sentOnce.current) return;
    sentOnce.current = true;
    sendSignupCode()
      .then(() => setDeadline(Date.now() + RESEND_SECONDS * 1000))
      .catch((err) => {
        if (err.code === 'otp/too-soon') {
          if (err.retryAfter) setDeadline(Date.now() + err.retryAfter * 1000);
          return;
        }
        setDeadline(Date.now());
        setError(friendlyError(err));
      });
  }, [user]);

  if (loading) return <div className="splash" role="status" aria-label="Loading"><span className="spinner" /></div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (!needsEmailCode(user)) return <Navigate to="/home" replace />;

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const mmss = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy('verify'); setError(null); setNote(null);
    try {
      await checkSignupCode(code);
      await refreshUser(); // the gate then moves on to onboarding
    } catch (err) {
      setError(friendlyError(err)); setBusy(null);
    }
  };

  const resend = async () => {
    setBusy('resend'); setError(null); setNote(null);
    try {
      await sendSignupCode();
      setDeadline(Date.now() + RESEND_SECONDS * 1000);
      setCode('');
      setNote('New code sent. Use the newest one; older codes stop working.');
    } catch (err) {
      if (err.code === 'otp/too-soon' && err.retryAfter) setDeadline(Date.now() + err.retryAfter * 1000);
      setError(friendlyError(err));
    }
    setBusy(null);
  };

  return (
    <AuthLayout variant="check">
      <div className="icon-tile" style={{ background: 'var(--sky)' }}><MailIcon /></div>
      <h1 className="title" style={{ marginTop: 24 }}>Confirm your email</h1>
      <p className="lead">
        We've sent a 6-digit code to <strong>{user.email}</strong>. It works for 10 minutes.
      </p>

      <form className="form" style={{ marginTop: 28, gap: 18 }} onSubmit={submit} noValidate>
        <ErrorAlert id="verify-error">{error}</ErrorAlert>
        <div className="field">
          <label htmlFor="code" className="label">6-digit code</label>
          <input id="code" className="input otp-input" type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]*" value={code} autoFocus placeholder="••••••"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'verify-error' : undefined} required />
        </div>
        <SubmitButton busy={busy === 'verify'} disabled={code.length !== 6 || busy === 'resend'}>Confirm email</SubmitButton>
      </form>

      <div className="alert alert-info" style={{ marginTop: 24, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClockIcon />
          {left > 0 ? <span>Didn't get it? Check spam, or resend in <strong>{mmss}</strong></span> : <span>Still nothing in your inbox?</span>}
        </span>
        {left === 0 && (
          <button type="button" className="btn btn-tangerine btn-sm" onClick={resend} disabled={!!busy}>Resend code</button>
        )}
      </div>
      <div aria-live="polite" style={{ marginTop: 12 }}>
        {note && <p className="field-ok">{note}</p>}
      </div>

      <p className="small" style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.5 }}>
        Wrong email?{' '}
        <button type="button" className="link-btn" onClick={() => signOut()}>Sign out and sign up again</button>
      </p>
    </AuthLayout>
  );
}
