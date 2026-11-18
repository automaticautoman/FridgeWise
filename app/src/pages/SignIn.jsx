import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { PasswordField, GoogleButton, ErrorAlert, SubmitButton } from '../components/ui';
import { signInWithEmail, continueWithGoogle } from '../auth/authService';
import { friendlyError } from '../auth/errors';
import { isEmail } from '../lib/passwordRules';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'email' | 'google'

  const submit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) { setError("That doesn't look like an email address."); return; }
    setBusy('email'); setError(null);
    try {
      await signInWithEmail({ email, password });
      // The route guard sends the user on once auth state changes.
    } catch (err) {
      setError(friendlyError(err));
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google'); setError(null);
    try { await continueWithGoogle(); } catch (err) { setError(friendlyError(err)); setBusy(null); }
  };

  const failed = !!error;
  return (
    <AuthLayout variant="signin">
      <h1 className="title">Welcome back, Chef!</h1>
      <p className="lead">Sign in to see what's fresh in your kitchen.</p>

      <div style={{ marginTop: 32 }}>
        <GoogleButton onClick={google} busy={busy === 'google'}>Continue with Google</GoogleButton>
      </div>
      <div className="divider" style={{ marginTop: 24 }}><span>or sign in with email</span></div>

      <form className="form" style={{ marginTop: 24 }} onSubmit={submit} noValidate>
        <ErrorAlert id="signin-error">
          {error && (
            <><strong>{error}</strong>{error.includes("don't match") && <> Check them and try again, or <Link to="/forgot-password">reset your password</Link>.</>}</>
          )}
        </ErrorAlert>
        <div className="field">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={failed ? 'true' : undefined}
            aria-describedby={failed ? 'signin-error' : undefined} required />
        </div>
        <PasswordField id="password" label="Password" value={password} onChange={setPassword}
          invalid={failed} describedBy={failed ? 'signin-error' : undefined}
          rightLink={<Link to="/forgot-password" style={{ fontSize: 14, padding: '4px 0' }}>Forgot password?</Link>} />
        <div style={{ marginTop: 8 }}>
          <SubmitButton busy={busy === 'email'} disabled={!email || !password}>{failed ? 'Try again' : 'Sign in'}</SubmitButton>
        </div>
      </form>

      <p className="center small" style={{ margin: '28px 0 0', fontSize: 15 }}>New to FridgeWise? <Link to="/signup">Create an account</Link></p>
    </AuthLayout>
  );
}
