import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FridgeIcon, EyeIcon, CheckIcon, CircleIcon, AlertIcon, WifiOffIcon } from './Icons';
import { checkPassword } from '../lib/passwordRules';

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="FridgeWise home">
      <span className="logo-mark"><FridgeIcon /></span>
      <span className="logo-word">FridgeWise</span>
    </Link>
  );
}

export function PasswordField({ id, label, value, onChange, autoComplete = 'current-password', invalid, describedBy, rightLink, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <div className="field-row">
        <label htmlFor={id} className="label">{label}</label>
        {rightLink}
      </div>
      <div className="pw-wrap">
        <input
          id={id}
          className="input has-toggle"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus}
          required
        />
        <button type="button" className="pw-toggle" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)}>
          <EyeIcon off={show} />
        </button>
      </div>
    </div>
  );
}

export function PasswordRules({ id, password, extra = [] }) {
  const rules = [...checkPassword(password), ...extra];
  return (
    <ul id={id} className="rules" aria-live="polite">
      {rules.map((r) => (
        <li key={r.id} className={'rule' + (r.ok ? ' ok' : '')}>
          {r.ok ? <CheckIcon /> : <CircleIcon />}
          {r.label}{r.ok ? '' : r.progress}
          <span className="sr-only">{r.ok ? '(done)' : '(not yet)'}</span>
        </li>
      ))}
    </ul>
  );
}

export function GoogleButton({ onClick, busy, children }) {
  return (
    <button type="button" className="google-btn" onClick={onClick} disabled={busy}>
      {busy ? <span className="spinner" aria-hidden="true" /> : <img src="/google-g.png" alt="" />}
      {children}
    </button>
  );
}

export function ErrorAlert({ id, children }) {
  if (!children) return null;
  return (
    <div id={id} role="alert" className="alert alert-error">
      <span className="alert-dot"><AlertIcon size={16} /></span>
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ busy, disabled, children, className = 'btn btn-primary btn-block' }) {
  return (
    <button type="submit" className={className} disabled={disabled || busy} aria-busy={busy || undefined}>
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-bar" role="status"><WifiOffIcon /> You're offline. You're still signed in, and changes will sync later.</div>
  );
}
