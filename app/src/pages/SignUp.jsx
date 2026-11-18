import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { PasswordField, PasswordRules, GoogleButton, ErrorAlert, SubmitButton } from '../components/ui';
import { signUpWithEmail, continueWithGoogle } from '../auth/authService';
import { friendlyError } from '../auth/errors';
import { isEmail, isStrongEnough } from '../lib/passwordRules';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [touched, setTouched] = useState({});

  const nameOk = name.trim().length >= 1 && name.trim().length <= 60;
  const emailOk = isEmail(email);
  const pwOk = isStrongEnough(password);
  const ready = nameOk && emailOk && pwOk;

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true });
    if (!ready) return;
    setBusy('email'); setError(null);
    try {
      await signUpWithEmail({ name, email, password });
    } catch (err) {
      setError(friendlyError(err)); setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google'); setError(null);
    try { await continueWithGoogle(); } catch (err) { setError(friendlyError(err)); setBusy(null); }
  };

  return (
    <AuthLayout variant="signup">
      <h1 className="title">Create your account</h1>
      <p className="lead">Everyone gets their own account, even in a shared kitchen.</p>

      <div style={{ marginTop: 28 }}>
        <GoogleButton onClick={google} busy={busy === 'google'}>Sign up with Google</GoogleButton>
      </div>
      <div className="divider" style={{ marginTop: 22 }}><span>or use your email</span></div>

      <form className="form" style={{ marginTop: 22, gap: 14 }} onSubmit={submit} noValidate>
        <ErrorAlert id="signup-error">{error}</ErrorAlert>
        <div className="field">
          <label htmlFor="name" className="label">Name</label>
          <input id="name" className="input" type="text" autoComplete="name" maxLength={60} value={name}
            onChange={(e) => setName(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            aria-invalid={touched.name && !nameOk ? 'true' : undefined} aria-describedby="name-err" required />
          {touched.name && !nameOk && <p id="name-err" className="field-error">Tell us what to call you.</p>}
        </div>
        <div className="field">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={touched.email && !emailOk ? 'true' : undefined} aria-describedby="email-err" required />
          {touched.email && !emailOk && <p id="email-err" className="field-error">That doesn't look like an email address.</p>}
        </div>
        <div className="field">
          <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" describedBy="pw-rules" />
          <PasswordRules id="pw-rules" password={password} />
        </div>
        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={busy === 'email'} disabled={!ready}>Create account</SubmitButton>
        </div>
      </form>

      <p className="center small" style={{ margin: '24px 0 0', fontSize: 15 }}>Already have an account? <Link to="/signin">Sign in</Link></p>
    </AuthLayout>
  );
}
