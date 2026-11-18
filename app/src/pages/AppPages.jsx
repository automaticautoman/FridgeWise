import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useKitchens, pendingInvite } from '../kitchen/KitchenProvider';
import { KitchenTile, kitchenMeta } from '../kitchen/kitchenUi';
import { AppLayout } from '../components/Layouts';
import { ErrorAlert } from '../components/ui';
import { ChevronIcon, CheckIcon, PeopleIcon, HouseIcon, DoorIcon, BellIcon, LockIcon, LeafIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthProvider';
import { hasPasswordProvider, hasGoogleProvider } from '../auth/authService';
import { saveProfile } from '../lib/profile';
import { DietaryFields } from './Onboarding';

// Next step on Home, from the choice made in onboarding (F05).
const KITCHEN_NEXT = {
  'create-shared': { title: 'Start your shared kitchen', text: 'Name it, then invite your housemates.', cta: 'Start kitchen', to: '/kitchen/new?type=shared', icon: <PeopleIcon />, tile: 'var(--sky)' },
  'create-private': { title: 'Start your home kitchen', text: 'Name it and pick your storage spots.', cta: 'Start kitchen', to: '/kitchen/new?type=private', icon: <HouseIcon />, tile: 'var(--butter)' },
  join: { title: 'Join your housemates', text: 'Open the invite link, or type the 6-character code.', cta: 'Enter code', to: '/kitchen/join', icon: <DoorIcon />, tile: 'var(--mint)' },
  later: { title: 'Set up a kitchen', text: 'Start one, or join your housemates with a code.', cta: 'Get started', to: '/kitchen', icon: <HouseIcon />, tile: 'var(--butter)' }
};

export function Home() {
  const { profile, user } = useAuth();
  const { active, loading } = useKitchens();
  const name = ((profile && profile.name) || user.displayName || 'Chef').split(' ')[0];
  const choice = (profile && profile.onboarding && profile.onboarding.kitchenChoice) || 'later';
  const next = KITCHEN_NEXT[choice] || KITCHEN_NEXT.later;

  // Opened an invite link before signing in or finishing onboarding.
  if (pendingInvite.get()) return <Navigate to="/kitchen/join" replace />;
  // FR3.17: opening the app shows the kitchen, expiring-soon first.
  if (!loading && active) return <Navigate to="/kitchen" replace />;

  return (
    <AppLayout>
      <h1 className="title">Hi {name}!</h1>
      <p className="lead">{active ? 'Here\'s your kitchen.' : "You're signed in. Your kitchen is the next step."}</p>
      <div className="card-row">
        {!loading && active && (
          <section className="card" style={{ flex: '1 1 420px', display: 'flex', alignItems: 'center', gap: 18 }}>
            <KitchenTile kitchen={active} size="xl" />
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <h2 className="h2">{active.name}</h2>
              <p className="small" style={{ margin: '4px 0 0', fontSize: 15 }}>{kitchenMeta(active, user.uid)}</p>
            </div>
            <Link to="/kitchen" className="btn btn-primary btn-sm">Open kitchen</Link>
          </section>
        )}
        {!loading && !active && (
          <section className="card" style={{ flex: '1 1 420px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
            <span aria-hidden="true" style={{ flexShrink: 0, width: 64, height: 64, borderRadius: 20, background: next.tile, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{next.icon}</span>
            <div style={{ flex: '1 1 200px' }}>
              <h2 className="h2">{next.title}</h2>
              <p className="small" style={{ margin: '4px 0 0', fontSize: 15 }}>{next.text}</p>
            </div>
            <Link to={next.to} className="btn btn-primary btn-sm">{next.cta}</Link>
          </section>
        )}
      </div>
    </AppLayout>
  );
}

export function Soon() {
  const { section } = useParams();
  const names = { kitchen: 'My Kitchen', expiry: 'Expiry Tracker', recipes: 'Discover Recipes', shopping: 'Shopping List' };
  return (
    <AppLayout>
      <h1 className="title">{names[section] || 'Coming soon'}</h1>
      <p className="lead">This part of FridgeWise is still cooking. Check back soon.</p>
    </AppLayout>
  );
}

function Row({ to, icon, title, sub }) {
  return (
    <Link to={to} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, textDecoration: 'none', background: 'var(--cream)' }}>
      <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>{title}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>{sub}</span>
      </span>
      <ChevronIcon />
    </Link>
  );
}

export function Settings() {
  const { user, profile } = useAuth();
  const methods = [hasPasswordProvider(user) && 'Email and password', hasGoogleProvider(user) && 'Google'].filter(Boolean).join(' · ');
  const d = (profile && profile.dietary) || { allergens: [] };
  const diet = [d.vegetarian && 'Vegetarian', d.halal && 'Halal', ...(d.allergens || []).map((a) => 'No ' + a.toLowerCase())].filter(Boolean).join(', ') || 'None set';
  const perm = profile && profile.notifications ? profile.notifications.permission : 'default';
  const permText = { granted: 'On', denied: 'Blocked in your browser', 'not-asked': 'Off', unsupported: 'In-app only', default: 'Off' }[perm] || 'Off';
  return (
    <AppLayout>
      <h1 className="title">Profile &amp; Settings</h1>
      <p className="lead">{profile && profile.name} · {user.email}</p>
      <section className="card" style={{ marginTop: 32, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Row to="/settings/password" icon={<LockIcon />} title={hasPasswordProvider(user) ? 'Change password' : 'Add a password'} sub={'Sign-in: ' + methods} />
        <Row to="/settings/preferences" icon={<LeafIcon />} title="Food preferences" sub={diet} />
        <Row to="/settings/preferences" icon={<BellIcon />} title="Reminders" sub={permText} />
      </section>
    </AppLayout>
  );
}

export function Preferences() {
  const { user, profile } = useAuth();
  const [diet, setDiet] = useState((profile && profile.dietary) || { vegetarian: false, halal: false, allergens: [] });
  const [state, setState] = useState(null);
  const supported = typeof window !== 'undefined' && 'Notification' in window;
  const perm = supported ? Notification.permission : 'unsupported';

  const save = async () => {
    setState('saving');
    try {
      await Promise.race([saveProfile(user.uid, { dietary: diet }), new Promise((r) => setTimeout(r, 4000))]);
      setState('saved');
    } catch { setState('error'); }
  };
  const ask = async () => {
    const p = await Notification.requestPermission();
    await saveProfile(user.uid, { notifications: { explained: true, permission: p } });
  };

  return (
    <AppLayout>
      <nav aria-label="Breadcrumb" className="crumbs"><Link to="/settings">Profile &amp; Settings</Link><ChevronIcon /><span aria-current="page">Preferences</span></nav>
      <h1 className="title" style={{ marginTop: 12 }}>Preferences</h1>
      <div className="card-row">
        <section className="card" style={{ flex: '1 1 460px', maxWidth: 640 }}>
          <h2 className="h2" style={{ marginBottom: 18 }}>Food</h2>
          <DietaryFields value={diet} onChange={(v) => { setDiet(v); setState(null); }} />
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <button type="button" className="btn btn-primary" onClick={save} disabled={state === 'saving'}>Save</button>
            <span aria-live="polite">{state === 'saved' && <span className="field-ok"><CheckIcon /> Saved</span>}</span>
          </div>
          {state === 'error' && <div style={{ marginTop: 12 }}><ErrorAlert>We couldn't save that. Please try again.</ErrorAlert></div>}
        </section>
        <section className="card" style={{ flex: '1 1 300px', maxWidth: 380 }}>
          <h2 className="h2">Reminders</h2>
          <p className="small" style={{ fontSize: 15, lineHeight: 1.5 }}>
            {perm === 'granted' && 'Notifications are on for this device.'}
            {perm === 'denied' && 'Notifications are blocked. Allow them in your browser settings for this site.'}
            {perm === 'default' && 'Notifications are off for this device.'}
            {perm === 'unsupported' && "This browser can't show notifications. On iPhone, add FridgeWise to your Home Screen first."}
          </p>
          {perm === 'default' && <button type="button" className="btn btn-secondary btn-sm" onClick={ask}>Turn on reminders</button>}
        </section>
      </div>
    </AppLayout>
  );
}
