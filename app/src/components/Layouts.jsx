import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandPanel from './BrandPanel';
import { Logo } from './ui';
import { FridgeIcon, SignOutIcon } from './Icons';
import { useAuth } from '../auth/AuthProvider';
import { signOut } from '../auth/authService';
import { useKitchens } from '../kitchen/KitchenProvider';

export function AuthLayout({ variant, topRight, children }) {
  return (
    <div className="auth">
      <main className="auth-main">
        <div className="auth-top"><Logo />{topRight}</div>
        <div className="auth-center"><div className="auth-col">{children}</div></div>
      </main>
      <aside className="auth-aside" aria-hidden="true"><BrandPanel variant={variant} /></aside>
    </div>
  );
}

const NAV = [
  { to: '/home', label: 'Home', icon: <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg> },
  { to: '/kitchen', label: 'My Kitchen', icon: <FridgeIcon size={22} sw={2} /> },
  { to: '/soon/expiry', label: 'Expiry Tracker', icon: <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" /></svg> },
  { to: '/soon/recipes', label: 'Discover Recipes', icon: <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.9A4 4 0 0 1 7.4 6a5 5 0 0 1 9.2 0A4 4 0 0 1 18 13.9V21H6z" /><path d="M6 17h12" /></svg> },
  { to: '/soon/shopping', label: 'Shopping List', icon: <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="20.5" r="1.5" /><circle cx="18" cy="20.5" r="1.5" /><path d="M2 3h2.5l2.6 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L21.5 8H5.6" /></svg> },
  { to: '/settings', label: 'Profile & Settings', icon: <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg> }
];

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

export function AppLayout({ children }) {
  const { user, profile } = useAuth();
  const { active, loading } = useKitchens();
  const navigate = useNavigate();
  const kitchenLabel = loading ? '' : active ? active.name : 'No kitchen yet';
  const name = (profile && profile.name) || (user && user.displayName) || 'Chef';
  const doSignOut = async () => { await signOut(); navigate('/signin', { replace: true }); };
  const { pathname } = useLocation();
  // The + isn't needed on screens that are already about adding.
  const hideFab = /^\/kitchen\/(add|item)/.test(pathname);

  return (
    <div className="app">
      <div className="app-side">
        <nav aria-label="Main" className="sidebar">
          <div style={{ padding: '0 8px' }}><Logo to="/home" /></div>
          <ul className="nav">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                  {n.icon}{n.label}{n.to.startsWith('/soon') && <span className="soon">Soon</span>}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="sidebar-spacer" style={{ flexGrow: 1 }} />
          <div className="me">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="avatar" aria-hidden="true">{initials(name)}</span>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{name}</span>
                <span className="me-kitchen" title={user && user.email}>{kitchenLabel || (user && user.email)}</span>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={doSignOut}><SignOutIcon /> Sign out</button>
          </div>
        </nav>
      </div>
      {/* Phones (S4/S9 wireframes): logo on top, bottom bar, floating + to add. */}
      <header className="mobile-top"><Logo to="/home" /><span className="avatar" aria-hidden="true">{initials(name)}</span></header>
      <main className="app-main">{children}</main>
      {active && !hideFab && (
        <Link to="/kitchen/add" className="fab" aria-label="Add item">
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        </Link>
      )}
      <nav aria-label="Main" className="bottom-nav">
        {BOTTOM.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive || (n.also && n.also.some((p) => pathname.startsWith(p))) ? 'active' : undefined)}>
            {n.icon}<span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const BOTTOM = [
  { to: '/kitchen', label: 'Home', also: ['/home'], icon: NAV[0].icon },
  { to: '/soon/shopping', label: 'Grocery', icon: NAV[4].icon },
  { to: '/soon/recipes', label: 'Recipes', icon: NAV[3].icon },
  { to: '/settings', label: 'Me', icon: NAV[5].icon }
];
