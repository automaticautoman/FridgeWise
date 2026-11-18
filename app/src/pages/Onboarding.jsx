import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/Layouts';
import { ErrorAlert } from '../components/ui';
import { PeopleIcon, HouseIcon, DoorIcon, BellIcon, LeafIcon, CheckIcon } from '../components/Icons';
import { useAuth } from '../auth/AuthProvider';
import { saveProfile, ALLERGENS } from '../lib/profile';

const KITCHEN_OPTIONS = [
  { id: 'create-shared', title: 'Start a shared kitchen', text: 'A dorm or flat. Invite housemates with a link or code.', tile: 'var(--sky)', icon: <PeopleIcon /> },
  { id: 'create-private', title: 'Start my home kitchen', text: 'Just you, or family later.', tile: 'var(--butter)', icon: <HouseIcon /> },
  { id: 'join', title: 'Join a kitchen', text: 'Someone sent you a link or a 6-character code.', tile: 'var(--mint)', icon: <DoorIcon /> }
];

function Steps({ step }) {
  return (
    <div className="steps" aria-label={'Step ' + (step + 1) + ' of 3'} role="img">
      {[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
    </div>
  );
}

// Shared with Settings so dietary preferences are stored once (F05, F60).
export function DietaryFields({ value, onChange }) {
  const toggle = (k) => onChange({ ...value, [k]: !value[k] });
  const toggleAllergen = (a) => {
    const has = value.allergens.includes(a);
    onChange({ ...value, allergens: has ? value.allergens.filter((x) => x !== a) : [...value.allergens, a] });
  };
  return (
    <>
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend className="label" style={{ padding: 0, marginBottom: 10 }}>What do you eat?</legend>
        <div className="pill-group">
          <button type="button" className="pill" aria-pressed={!!value.vegetarian} onClick={() => toggle('vegetarian')}>{value.vegetarian && <CheckIcon color="#fff" />}Vegetarian</button>
          <button type="button" className="pill" aria-pressed={!!value.halal} onClick={() => toggle('halal')}>{value.halal && <CheckIcon color="#fff" />}Halal</button>
        </div>
      </fieldset>
      <fieldset style={{ border: 'none', margin: '20px 0 0', padding: 0 }}>
        <legend className="label" style={{ padding: 0, marginBottom: 4 }}>Allergies</legend>
        <p className="small" style={{ margin: '0 0 10px' }}>Recipes with these will never be suggested.</p>
        <div className="pill-group">
          {ALLERGENS.map((a) => {
            const on = value.allergens.includes(a);
            return <button key={a} type="button" className="pill" aria-pressed={on} onClick={() => toggleAllergen(a)}>{on && <CheckIcon color="#fff" />}{a}</button>;
          })}
        </div>
      </fieldset>
    </>
  );
}

export default function Onboarding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [kitchen, setKitchen] = useState((profile && profile.onboarding && profile.onboarding.kitchenChoice) || null);
  const [diet, setDiet] = useState((profile && profile.dietary) || { vegetarian: false, halal: false, allergens: [] });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const firstName = ((profile && profile.name) || '').split(' ')[0] || 'Chef';

  const save = async (changes, next) => {
    setBusy(true); setError(null);
    try {
      // Offline writes are queued by Firestore and sync later, so don't wait forever.
      await Promise.race([saveProfile(user.uid, changes), new Promise((r) => setTimeout(r, 4000))]);
      next();
    } catch (err) {
      setError('We couldn’t save that. Please try again.');
    }
    setBusy(false);
  };

  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window;
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const askPermission = async () => {
    let permission = 'unsupported';
    if (notificationsSupported) {
      try { permission = await Notification.requestPermission(); } catch { permission = 'default'; }
    }
    save({ 'notifications': { explained: true, permission } }, () => setStep(2));
  };

  return (
    <AuthLayout variant="onboarding">
      <Steps step={step} />
      <ErrorAlert>{error}</ErrorAlert>

      {step === 0 && (
        <section aria-labelledby="ob-1">
          <h1 id="ob-1" className="title" style={{ marginTop: 24 }}>Hey {firstName}! Where do you cook?</h1>
          <p className="lead">FridgeWise works around a kitchen. Pick one to get started.</p>
          <div role="radiogroup" aria-labelledby="ob-1" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {KITCHEN_OPTIONS.map((o) => (
              <button key={o.id} type="button" role="radio" aria-checked={kitchen === o.id} className="option"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} onClick={() => setKitchen(o.id)}>
                <span aria-hidden="true" style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, background: o.tile, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><strong style={{ color: 'var(--cocoa)' }}>{o.title}</strong><span>{o.text}</span></span>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 24 }} disabled={!kitchen || busy}
            onClick={() => save({ 'onboarding': { completed: false, kitchenChoice: kitchen } }, () => setStep(1))}>Continue</button>
          <button type="button" className="link-btn" style={{ display: 'block', margin: '16px auto 0' }} disabled={busy}
            onClick={() => save({ 'onboarding': { completed: false, kitchenChoice: 'later' } }, () => setStep(1))}>I'll do this later</button>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="ob-2">
          <div className="icon-tile" style={{ marginTop: 24, background: 'var(--lilac)' }}><BellIcon size={34} /></div>
          <h1 id="ob-2" className="title" style={{ marginTop: 20 }}>A nudge before food goes off</h1>
          <p className="lead">If you allow notifications, FridgeWise can remind you:</p>
          <ul style={{ margin: '14px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 16, lineHeight: 1.5 }}>
            <li>Once a day, at a time you choose, with what's expiring soon.</li>
            <li>On the day something expires, so you can still use it.</li>
            <li>Only about your items and shared items you opt into. Never every change your housemates make.</li>
          </ul>
          {!notificationsSupported && isIOS && (
            <div className="alert alert-info" style={{ marginTop: 18 }}>
              <span>On iPhone, first add FridgeWise to your Home Screen: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. Open it from there to turn on reminders.</span>
            </div>
          )}
          {!notificationsSupported && !isIOS && (
            <div className="alert alert-info" style={{ marginTop: 18 }}><span>This browser can't show notifications. You'll still see reminders inside the app.</span></div>
          )}
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 24 }} disabled={busy} onClick={askPermission}>
            {notificationsSupported ? 'Turn on reminders' : 'Got it'}
          </button>
          <button type="button" className="link-btn" style={{ display: 'block', margin: '16px auto 0' }} disabled={busy}
            onClick={() => save({ 'notifications': { explained: true, permission: 'not-asked' } }, () => setStep(2))}>Not now</button>
          <p className="small center" style={{ marginTop: 12 }}>You can change this any time in Settings.</p>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="ob-3">
          <div className="icon-tile" style={{ marginTop: 24, background: 'var(--mint)' }}><LeafIcon /></div>
          <h1 id="ob-3" className="title" style={{ marginTop: 20 }}>Any food preferences?</h1>
          <p className="lead">Optional. This shapes your recipe ideas.</p>
          <div style={{ marginTop: 24 }}><DietaryFields value={diet} onChange={setDiet} /></div>
          <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 28 }} disabled={busy}
            onClick={() => save({ dietary: diet, 'onboarding': { completed: true, kitchenChoice: kitchen || 'later' } }, () => navigate('/home', { replace: true }))}>Finish</button>
          <button type="button" className="link-btn" style={{ display: 'block', margin: '16px auto 0' }} disabled={busy}
            onClick={() => save({ 'onboarding': { completed: true, kitchenChoice: kitchen || 'later' } }, () => navigate('/home', { replace: true }))}>Skip</button>
        </section>
      )}
    </AuthLayout>
  );
}
