// Kitchen settings (S9 wireframe, "Settings" tab): rename, storage spots and
// who can invite. Owner only; members see the settings read-only.
import { useEffect, useState } from 'react';
import { ErrorAlert } from '../components/ui';
import { friendlyError } from '../auth/errors';
import { updateKitchen } from '../lib/kitchens';
import { useKitchens } from '../kitchen/KitchenProvider';
import { KitchenLayout } from '../kitchen/KitchenLayout';
import { useItems } from '../kitchen/itemUi';
import { spotStyle, plural, PlusGlyph, CheckGlyph, CloseGlyph, InfoGlyph } from '../kitchen/kitchenUi';
import { WithKitchen } from './KitchenPages';

export function KitchenSettings() {
  return <WithKitchen><KitchenLayout tab="settings"><SettingsBody /></KitchenLayout></WithKitchen>;
}

function SettingsBody() {
  const { active, isOwner } = useKitchens();
  const items = useItems(active.id);
  const [name, setName] = useState(active.name);
  const [spots, setSpots] = useState(active.locations || []);
  const [newSpot, setNewSpot] = useState('');
  const [policy, setPolicy] = useState(active.invitePolicy || 'anyone');
  const [state, setState] = useState(null); // 'saving' | 'saved'
  const [error, setError] = useState(null);

  // Another member (or another tab) changed it: start from the new values.
  useEffect(() => { setName(active.name); setSpots(active.locations || []); setPolicy(active.invitePolicy || 'anyone'); }, [active.id, active.name, active.locations, active.invitePolicy]);

  const countIn = (s) => (items || []).filter((i) => i.location === s).length;
  const changed = name.trim() !== active.name || JSON.stringify(spots) !== JSON.stringify(active.locations || []) || policy !== (active.invitePolicy || 'anyone');

  const addSpot = () => {
    const s = newSpot.replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!s) return;
    if (spots.some((x) => x.toLowerCase() === s.toLowerCase())) { setError(`There's already a spot called ${s}.`); return; }
    if (spots.length >= 8) { setError('A kitchen can have up to 8 storage spots.'); return; }
    setSpots([...spots, s]); setNewSpot(''); setError(null); setState(null);
  };
  const removeSpot = (s) => { setSpots(spots.filter((x) => x !== s)); setState(null); };

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Give the kitchen a name.'); return; }
    if (!spots.length) { setError('Keep at least one storage spot.'); return; }
    setState('saving'); setError(null);
    try {
      const changes = {};
      if (name.trim() !== active.name) changes.name = name.trim();
      if (JSON.stringify(spots) !== JSON.stringify(active.locations || [])) changes.locations = spots;
      if (active.type === 'shared' && policy !== (active.invitePolicy || 'anyone')) changes.invitePolicy = policy;
      await updateKitchen(active.id, changes);
      setState('saved');
    } catch (err) { setError(friendlyError(err)); setState(null); }
  };

  return (
    <form onSubmit={save} className="card" style={{ marginTop: 28, maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 26 }} noValidate>
      <div>
        <h1 className="h2" style={{ fontSize: 32 }}>Kitchen settings</h1>
        <p className="lead" style={{ fontSize: 16 }}>{active.type === 'private' ? 'Private kitchen' : 'Shared kitchen'} · {plural(active.memberCount || 1, 'member')}</p>
      </div>
      {!isOwner && <p className="note"><InfoGlyph />Only the owner can change these settings.</p>}
      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="field">
        <label htmlFor="kset-name" className="label">Kitchen name</label>
        <input id="kset-name" className="input" maxLength={40} value={name} disabled={!isOwner} onChange={(e) => { setName(e.target.value); setState(null); }} />
      </div>

      <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Storage spots</legend>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {spots.map((s) => {
            const n = countIn(s);
            const { bg, Icon } = spotStyle(s);
            return (
              <li key={s} className="mrow" style={{ background: 'var(--cream)' }}>
                <span aria-hidden="true" className="ktile sm" style={{ background: bg }}><Icon /></span>
                <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{s}</span>
                  <span className="small">{plural(n, 'item')}</span>
                </span>
                {isOwner && (
                  <button type="button" className="ghost-btn" disabled={n > 0 || spots.length === 1} aria-label={`Remove ${s}`}
                    title={n > 0 ? 'Use up or move its items first' : undefined} onClick={() => removeSpot(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: n > 0 || spots.length === 1 ? 0.5 : 1 }}>
                    <CloseGlyph size={16} /> Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {isOwner && spots.some((s) => countIn(s) > 0) && <span className="small">A spot with items in it can't be removed. Use them up or move them first.</span>}
        {isOwner && spots.length < 8 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" aria-label="New storage spot" placeholder="e.g. Freezer" maxLength={24} value={newSpot} style={{ height: 48, flexGrow: 1, minWidth: 0 }}
              onChange={(e) => setNewSpot(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSpot(); } }} />
            <button type="button" className="btn btn-secondary btn-sm" style={{ height: 48 }} onClick={addSpot}><PlusGlyph size={16} /> Add spot</button>
          </div>
        )}
      </fieldset>

      {active.type === 'shared' && (
        <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Who can invite people?</legend>
          <div className="seg" role="radiogroup" aria-label="Who can invite people?" style={{ maxWidth: 360 }}>
            <button type="button" role="radio" aria-checked={policy === 'owner'} disabled={!isOwner} onClick={() => { setPolicy('owner'); setState(null); }}>Only me</button>
            <button type="button" role="radio" aria-checked={policy === 'anyone'} disabled={!isOwner} onClick={() => { setPolicy('anyone'); setState(null); }}>Any member</button>
          </div>
        </fieldset>
      )}

      {isOwner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="submit" className="btn btn-primary" disabled={!changed || state === 'saving'}>{state === 'saving' ? <span className="spinner" /> : 'Save changes'}</button>
          <span aria-live="polite">{state === 'saved' && !changed && <span className="field-ok"><CheckGlyph size={16} /> Saved</span>}</span>
        </div>
      )}
    </form>
  );
}
