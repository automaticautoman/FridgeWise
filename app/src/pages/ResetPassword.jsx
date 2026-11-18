import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { PasswordField, PasswordRules, ErrorAlert, SubmitButton } from '../components/ui';
import { CheckIcon, AlertIcon, ArrowIcon } from '../components/Icons';
import { finishPasswordReset } from '../auth/authService';
import { friendlyError } from '../auth/errors';
import { isStrongEnough } from '../lib/passwordRules';

function SessionExpired() {
  return (
    <AuthLayout variant="reset">
      <div className="icon-tile" style={{ background: 'var(--coral-tint)', color: 'var(--error)' }}><AlertIcon size={34} /></div>
      <h1 className="title" style={{ marginTop: 24 }}>Let's start that again</h1>
      <p className="lead">This reset took too long, or the code was already used. Codes work once and for 10 minutes.</p>
      <Link to="/forgot-password" className="btn btn-primary btn-block" style={{ marginTop: 32 }}>Get a new code <ArrowIcon /></Link>
      <p className="center small" style={{ margin: '24px 0 0', fontSize: 15 }}><Link to="/signin">Back to sign in</Link></p>
    </AuthLayout>
  );
}

// F03 step 3: after the code is verified, set the new password.
export function NewPassword() {
  const location = useLocation();
  const { email, resetToken } = location.state || {};
  if (!email || !resetToken) return <Navigate to="/forgot-password" replace />;
  return <ResetPassword email={email} resetToken={resetToken} />;
}

function ResetPassword({ email, resetToken }) {
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (expired) return <SessionExpired />;
  const state = { email };

  const strong = isStrongEnough(pw);
  const matches = confirm.length > 0 && pw === confirm;
  const mismatch = confirm.length > 0 && pw !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!strong || !matches) return;
    setBusy(true); setError(null);
    try {
      await finishPasswordReset(email, resetToken, pw);
      navigate('/reset-done', { replace: true });
    } catch (err) {
      if (err.code === 'otp/session-expired') setExpired(true);
      else { setError(friendlyError(err)); setBusy(false); }
    }
  };

  return (
    <AuthLayout variant="check" topRight={<Link to="/signin" style={{ fontSize: 15 }}>Cancel</Link>}>
      <span className="chip-ok"><CheckIcon /> Code verified for {state.email}</span>
      <h1 className="title" style={{ marginTop: 20 }}>Set a new password</h1>
      <p className="lead">Pick something you don't use anywhere else.</p>

      <form className="form" style={{ marginTop: 28, gap: 18 }} onSubmit={submit} noValidate>
        <ErrorAlert>{error}</ErrorAlert>
        <input type="email" autoComplete="username" value={state.email} readOnly hidden />
        <div className="field">
          <PasswordField id="new-password" label="New password" value={pw} onChange={setPw} autoComplete="new-password" describedBy="pw-rules" autoFocus />
          <PasswordRules id="pw-rules" password={pw} />
        </div>
        <div className="field">
          <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm}
            autoComplete="new-password" invalid={mismatch} describedBy="match-msg" />
          <div id="match-msg" aria-live="polite">
            {matches && <p className="field-ok"><CheckIcon /> Passwords match</p>}
            {mismatch && <p className="field-error"><AlertIcon /> Passwords don't match yet</p>}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={busy} disabled={!strong || !matches}>Save password</SubmitButton>
        </div>
      </form>
    </AuthLayout>
  );
}

export function ResetDone() {
  const confetti = [
    { top: 8, left: 18, w: 14, c: '#FFA552' }, { top: 20, right: 10, w: 10, c: '#C9B9F2' },
    { bottom: 14, left: 6, w: 10, c: '#A9D8F0' }, { bottom: 4, right: 26, w: 16, c: '#FFE28A' }, { top: 64, right: -4, w: 8, c: '#FF7F79' }
  ];
  return (
    <AuthLayout variant="done">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div aria-hidden="true" style={{ position: 'relative', width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {confetti.map((d, i) => (
            <span key={i} style={{ position: 'absolute', top: d.top, left: d.left, right: d.right, bottom: d.bottom, width: d.w, height: d.w, borderRadius: '50%', background: d.c }} />
          ))}
          <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#D6F0DC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#A8DDB5', boxShadow: '0 4px 0 #7FC291', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon size={44} color="#3D3533" sw={3} />
            </div>
          </div>
        </div>
        <h1 className="title" style={{ marginTop: 24 }}>Password updated!</h1>
        <p className="lead" style={{ marginTop: 10 }}>You're all set. Sign in with your new password to get back to your kitchen.</p>
        <Link to="/signin" className="btn btn-primary btn-block" style={{ marginTop: 32 }}>Back to sign in <ArrowIcon /></Link>
      </div>
    </AuthLayout>
  );
}
