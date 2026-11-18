// Pieces shared by the Epic 3 screens, styled after the
// epic3-inventory-quick-entry mockups.
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { watchItems, watchMembers } from '../lib/kitchens';
import { daysLeft } from '../lib/items';
import { initials } from './kitchenUi';

// ---------- live data ----------

export function useItems(kitchenId) {
  const [items, setItems] = useState(null);
  useEffect(() => {
    setItems(null);
    if (!kitchenId) return undefined;
    return watchItems(kitchenId, (list) => setItems(list.filter((i) => i.mode === 'level' || (Number(i.amount) || 0) > 0)), () => setItems([]));
  }, [kitchenId]);
  return items;
}

export function useMembers(kitchenId) {
  const [members, setMembers] = useState([]);
  useEffect(() => (kitchenId ? watchMembers(kitchenId, setMembers, () => setMembers([])) : undefined), [kitchenId]);
  return members;
}

// ---------- expiry (Main mockup colours) ----------

export function expiryInfo(expiry) {
  const d = daysLeft(expiry);
  if (d === null) return { d, label: 'No date', bg: '#F3ECE4', fg: '#5E5552' };
  if (d < 0) return { d, label: 'Expired', bg: '#FFE3E1', fg: '#8E2C26' };
  if (d === 0) return { d, label: 'Today', bg: '#FFE3E1', fg: '#8E2C26' };
  if (d === 1) return { d, label: 'Tomorrow', bg: '#FFF3C4', fg: '#5C4300' };
  if (d <= 3) return { d, label: `${d} days`, bg: '#FFF3C4', fg: '#5C4300' };
  if (d < 14) return { d, label: `${d} days`, bg: '#D6F0DC', fg: '#1F5E37' };
  if (d < 60) return { d, label: `${Math.round(d / 7)} weeks`, bg: '#D6F0DC', fg: '#1F5E37' };
  return { d, label: `${Math.round(d / 30)} months`, bg: '#D6F0DC', fg: '#1F5E37' };
}

export function ExpiryBadge({ expiry, wide }) {
  const e = expiryInfo(expiry);
  const text = e.d === null ? 'No date' : e.d < 0 ? 'Expired' : e.d <= 1 ? e.label : `In ${e.label}`;
  return (
    <span className="badge" style={{ background: e.bg, color: e.fg, fontSize: 13, height: 28, justifyContent: 'center', minWidth: wide ? 96 : undefined }}>
      {wide ? text : e.label}
    </span>
  );
}

// "Use by today", "Best before 15 Nov"
export function dateLine(item) {
  if (!item.expiry) return 'No expiry date';
  const kind = item.dateType === 'use-by' ? 'Use by' : 'Best before';
  const d = daysLeft(item.expiry);
  if (d === 0) return `${kind} today`;
  if (d === 1) return `${kind} tomorrow`;
  const [y, m, day] = item.expiry.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  const s = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: dt.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  return d < 0 ? `${kind} ${s} (passed)` : `${kind} ${s}`;
}

// ---------- owner (F27: words, not colour alone) ----------

export function ownerOf(item, uid, members) {
  if (item.shared) return { label: 'Shared', mark: 'S', bg: '#E3F3FB' };
  if (item.ownerId === uid) return { label: 'Yours', mark: 'Y', bg: '#FFE3E1' };
  const m = (members || []).find((x) => x.id === item.ownerId);
  const name = m ? m.name : 'A housemate';
  return { label: name.split(' ')[0], mark: initials(name), bg: '#EDE6FB' };
}

export function OwnerBadge({ item, members, size = 26 }) {
  const { user } = useAuth();
  const o = ownerOf(item, user.uid, members);
  return (
    <span className="badge" style={{ height: size, padding: '0 10px 0 6px', background: o.bg, color: 'var(--cocoa)' }}>
      <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{o.mark}</span>
      {o.label}
    </span>
  );
}

// ---------- level (F22) ----------

export function LevelBars({ level, w = 14 }) {
  const n = { low: 1, half: 2, full: 3 }[level] || 0;
  const c = level === 'low' ? '#D9524C' : '#3D3533';
  return (
    <span aria-hidden="true" style={{ display: 'flex', gap: 3 }}>
      {[1, 2, 3].map((i) => <span key={i} style={{ width: w, height: 10, borderRadius: 3, background: n >= i ? c : '#E3DCD3' }} />)}
    </span>
  );
}

// ---------- quantity stepper (F20) ----------

// live: report every typed number straight away (for values that aren't
// saved, like "how much to take out"), instead of only when you leave the box.
export function Stepper({ value, onChange, step = 1, unit, label = 'Amount', size = 40, inputWidth = 52, live = false }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = (v) => {
    const n = Math.max(0, Math.round(Number(v) * 1000) / 1000);
    if (Number.isFinite(n)) onChange(n); else setText(String(value));
  };
  const btn = { width: size, height: size, border: 'none', borderRadius: '50%', background: 'transparent', color: 'var(--cocoa)', fontSize: 22, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' };
  return (
    <div role="group" aria-label={label} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999, background: '#fff', border: '1.5px solid #D9D2CB' }}>
      <button type="button" aria-label="Less" style={btn} disabled={value <= 0} onClick={() => commit(Math.max(0, Math.round((value - step) * 1000) / 1000))}>−</button>
      <input aria-label={label} inputMode="decimal" value={text} style={{ width: inputWidth, height: size, border: 'none', textAlign: 'center', fontFamily: 'inherit', fontSize: 16, fontWeight: 800, color: 'var(--cocoa)', background: 'transparent', padding: 0 }}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, '');
          setText(t);
          if (live && t !== '' && !t.endsWith('.') && Number.isFinite(Number(t))) onChange(Math.max(0, Math.round(Number(t) * 1000) / 1000));
        }}
        onBlur={() => commit(text)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text); } }} />
      {unit && <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', paddingRight: 4 }}>{unit}</span>}
      <button type="button" aria-label="More" style={btn} onClick={() => commit(Math.round((value + step) * 1000) / 1000)}>+</button>
    </div>
  );
}

// "keeps about 7 days / 3 weeks / 6 months"
export function keepsAbout(days) {
  if (!days) return null;
  if (days < 14) return `keeps about ${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `keeps about ${Math.round(days / 7)} weeks`;
  if (days < 330) return `keeps about ${Math.round(days / 30)} months`;
  return 'keeps about a year';
}
