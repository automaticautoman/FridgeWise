import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { ErrorAlert, SubmitButton } from '../components/ui';
import { BackIcon, KeyIcon, MailIcon, ClockIcon, ArrowIcon } from '../components/Icons';
import { requestPasswordReset, verifyResetCode } from '../auth/authService';
import { friendlyError } from '../auth/errors';
import { isEmail } from '../lib/passwordRules';

const RESEND_SECONDS = 60;

// F03 step 1: ask for the email.
export function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state && location.state.email) || '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) { setError("That doesn't look like an email address."); return; }
    setBusy(true); setError(null);
    try {
      await requestPasswordReset(email);
      navigate('/reset/code', { state: { email: email.trim(), resendIn: RESEND_SECONDS } });
    } catch (err) {
      // A code was sent moments ago and still works: go and enter it.
      if (err.code === 'otp/too-soon') {
        navigate('/reset/code', { state: { email: email.trim(), resendIn: err.retryAfter || RESEND_SECONDS } });
        return;
      }
      setError(friendlyError(err)); setBusy(false);
    }
  };

  return (
    <AuthLayout variant="reset">
      <Link to="/signin" className="back"><BackIcon /> Back to sign in</Link>
      <div className="icon-tile" style={{ marginTop: 24, background: 'var(--butter)' }}><KeyIcon /></div>
      <h1 className="title" style={{ marginTop: 24 }}>Forgot your password?</h1>
      <p className="lead">No worries. Enter the email you signed up with and we'll send you a 6-digit code to set a new one.</p>

      <form className="form" style={{ marginTop: 32, gap: 24 }} onSubmit={submit} noValidate>
        <ErrorAlert id="forgot-error">{error}</ErrorAlert>
        <div className="field">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} autoFocus
            onChange={(e) => setEmail(e.target.value)} aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'forgot-error' : undefined} required />
        </div>
        <SubmitButton busy={busy} disabled={!email}>Send code <ArrowIcon /></SubmitButton>
      </form>

      <p className="center small" style={{ margin: '24px 0 0', fontSize: 15 }}>Remembered it? <Link to="/signin">Sign in</Link></p>
    </AuthLayout>
  );
}

// F03 step 2: enter the code. Neutral wording, with a resend timer.
export function EnterCode() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state && location.state.email) || '';
  const [deadline, setDeadline] = useState(() => Date.now() + ((location.state && location.state.resendIn) || RESEND_SECONDS) * 1000);
  const [now, setNow] = useState(Date.now());
  const [code, setCode] = useState('');
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'verify' | 'resend'

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!email) return <Navigate to="/forgot-password" replace />;

  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const mmss = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy('verify'); setError(null); setNote(null);
    try {
      const resetToken = await verifyResetCode(email, code);
      navigate('/reset/new', { replace: true, state: { email, resetToken } });
    } catch (err) {
      setError(friendlyError(err)); setBusy(null);
    }
  };

  const resend = async () => {
    setBusy('resend'); setError(null); setNote(null);
    try {
      await requestPasswordReset(email);
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
      <Link to="/forgot-password" state={{ email }} className="back"><BackIcon /> Back</Link>
      <div className="icon-tile" style={{ marginTop: 24, background: 'var(--sky)' }}><MailIcon /></div>
      <h1 className="title" style={{ marginTop: 24 }}>Check your email</h1>
      <p className="lead">
        If an account exists for <strong>{email}</strong>, we've sent a 6-digit code. It works for 10 minutes.
      </p>
      <p className="small" style={{ margin: '12px 0 0', fontSize: 15 }}>Wrong email? <Link to="/forgot-password" state={{ email }}>Change it</Link></p>

      <form className="form" style={{ marginTop: 28, gap: 18 }} onSubmit={submit} noValidate>
        <ErrorAlert id="code-error">{error}</ErrorAlert>
        <div className="field">
          <label htmlFor="code" className="label">6-digit code</label>
          <input id="code" className="input otp-input" type="text" inputMode="numeric" autoComplete="one-time-code"
            pattern="[0-9]*" value={code} autoFocus placeholder="••••••"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'code-error' : undefined} required />
        </div>
        <SubmitButton busy={busy === 'verify'} disabled={code.length !== 6 || busy === 'resend'}>Verify code</SubmitButton>
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
    </AuthLayout>
  );
}
