import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/Layouts';
import { PasswordField, PasswordRules, ErrorAlert, SubmitButton } from '../components/ui';
import { ChevronIcon, CheckIcon, AlertIcon, ShieldIcon, LockIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthProvider';
import { changePassword, addPasswordToGoogleAccount, hasPasswordProvider } from '../auth/authService';
import { friendlyError } from '../auth/errors';
import { isStrongEnough } from '../lib/passwordRules';

function Crumbs() {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      <Link to="/settings">Profile &amp; Settings</Link><ChevronIcon /><span aria-current="page">Change password</span>
    </nav>
  );
}

function NewPasswordFields({ pw, setPw, confirm, setConfirm, current }) {
  const mismatch = confirm.length > 0 && pw !== confirm;
  const matches = confirm.length > 0 && pw === confirm;
  const extra = current !== undefined
    ? [{ id: 'different', label: 'Not your current one', ok: pw.length > 0 && pw !== current, progress: '' }]
    : [];
  return (
    <>
      <div className="field">
        <PasswordField id="new-password" label="New password" value={pw} onChange={setPw} autoComplete="new-password" describedBy="pw-rules" />
        <PasswordRules id="pw-rules" password={pw} extra={extra} />
      </div>
      <div className="field">
        <PasswordField id="confirm-password" label="Confirm new password" value={confirm} onChange={setConfirm}
          autoComplete="new-password" invalid={mismatch} describedBy="match-msg" />
        <div id="match-msg" aria-live="polite">
          {mismatch && <p className="field-error"><AlertIcon /> Passwords don't match yet</p>}
          {matches && <p className="field-ok"><CheckIcon /> Passwords match</p>}
        </div>
      </div>
    </>
  );
}

// F04: email/password accounts confirm the current password first.
function PasswordForm() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState(null);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const ok = current && isStrongEnough(pw) && pw === confirm && pw !== current;

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null); setCurrentError(null); setDone(false);
    try {
      await changePassword(current, pw);
      setDone(true); setCurrent(''); setPw(''); setConfirm('');
    } catch (err) {
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(err.code)) {
        setCurrentError(friendlyError(err, 'reauth'));
      } else setError(friendlyError(err));
    }
    setBusy(false);
  };

  const reset = () => { setPw(''); setConfirm(''); setCurrent(''); setError(null); setCurrentError(null); };

  return (
    <form className="card form" style={{ flex: '1 1 460px', minWidth: 0, maxWidth: 640, gap: 20 }} onSubmit={submit} noValidate>
      {done && (
        <div role="status" className="alert alert-ok"><span className="alert-dot"><CheckIcon color="#3D3533" /></span>
          <span><strong>Password changed.</strong> Use the new one next time you sign in. Other devices may ask you to sign in again.</span></div>
      )}
      <ErrorAlert>{error}</ErrorAlert>
      <input type="email" autoComplete="username" value={user.email || ''} readOnly hidden />
      <div className="field">
        <PasswordField id="current-password" label="Current password" value={current} onChange={(v) => { setCurrent(v); setCurrentError(null); }}
          invalid={!!currentError} describedBy="current-err" />
        {currentError && <p id="current-err" role="alert" className="field-error"><AlertIcon /> {currentError}</p>}
        <Link to="/forgot-password" style={{ alignSelf: 'flex-start', padding: '4px 0', fontSize: 14 }}>Forgot it? Get a reset link by email</Link>
      </div>
      <div style={{ height: 2, borderRadius: 2, background: '#F3ECE4' }} />
      <NewPasswordFields pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} current={current} />
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>
        <SubmitButton busy={busy} disabled={!ok} className="btn btn-primary">Save password</SubmitButton>
      </div>
    </form>
  );
}

// F04 variant: Google-only accounts have no password, but can add one.
function GoogleOnly() {
  const { user, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const ok = isStrongEnough(pw) && pw === confirm;

  const submit = async (e) => {
    e.preventDefault();
    if (!ok) return;
    setBusy(true); setError(null);
    try {
      await addPasswordToGoogleAccount(pw);
      await refreshUser();
    } catch (err) {
      const msg = friendlyError(err);
      if (msg) setError(msg);
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'stretch' }}>
      <section className="card" style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 18, border: '1.5px solid #EFE7DE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/google-g.png" alt="" width="28" height="28" />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <h2 className="h2">You sign in with Google</h2>
            <span className="small" style={{ fontSize: 15 }}>{user.email}</span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>Your FridgeWise account doesn't have its own password. Google looks after your sign-in, so you change that password in your Google account, not here.</p>
        <div className="alert" style={{ background: 'var(--sky-tint)', fontSize: 14, fontWeight: 700, alignItems: 'center' }}><ShieldIcon /> Nothing to change on this page.</div>
      </section>

      <section style={{ flex: '1 1 380px', minWidth: 0, padding: 32, borderRadius: 24, background: 'var(--butter)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -40, top: -40, width: 140, height: 140, borderRadius: '50%', background: 'var(--tangerine)', opacity: 0.35 }} />
        <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LockIcon /></div>
        <h2 className="h2" style={{ position: 'relative' }}>Want to sign in with email too?</h2>
        <p style={{ position: 'relative', margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 600 }}>Add a FridgeWise password and you can sign in either way, even on a device without your Google account.</p>
        {!open ? (
          <>
            <div style={{ flexGrow: 1 }} />
            <button type="button" className="btn btn-tangerine" style={{ position: 'relative', alignSelf: 'flex-start' }} onClick={() => setOpen(true)}>Add a password</button>
          </>
        ) : (
          <form className="form" style={{ position: 'relative', gap: 14 }} onSubmit={submit} noValidate>
            <input type="email" autoComplete="username" value={user.email || ''} readOnly hidden />
            <ErrorAlert>{error}</ErrorAlert>
            <NewPasswordFields pw={pw} setPw={setPw} confirm={confirm} setConfirm={setConfirm} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <SubmitButton busy={busy} disabled={!ok} className="btn btn-tangerine">Save password</SubmitButton>
              <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setPw(''); setConfirm(''); }}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default function ChangePassword() {
  const { user } = useAuth();
  const hasPassword = hasPasswordProvider(user);
  return (
    <AppLayout>
      <Crumbs />
      <h1 className="title" style={{ marginTop: 12 }}>Change password</h1>
      <p className="lead">{hasPassword ? "Enter your current password first so we know it's really you." : "Here's how you sign in to FridgeWise right now."}</p>
      {hasPassword ? (
        <div className="card-row">
          <PasswordForm />
          <aside style={{ flex: '1 1 280px', minWidth: 0, maxWidth: 380, padding: 28, borderRadius: 24, background: 'var(--lilac)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldIcon /></div>
            <h2 className="h2">Make it a good one</h2>
            <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, lineHeight: 1.5, fontWeight: 600 }}>
              <li>Try three random words, like mango-kettle-rooftop.</li>
              <li>Don't reuse your email or bank password.</li>
              <li>Other devices may ask you to sign in again after you change it.</li>
            </ul>
          </aside>
        </div>
      ) : <GoogleOnly />}
    </AppLayout>
  );
}
