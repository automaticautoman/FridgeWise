// Small pieces shared by the Epic 2 screens.
import { useEffect, useRef } from 'react';

const base = { 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };
export const Svg = ({ size = 20, sw = 2, children, ...rest }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={sw} {...rest}>{children}</svg>
);

export const FridgeGlyph = (p) => <Svg {...p}><rect x="5" y="2" width="14" height="20" rx="3" /><path d="M5 10h14" /><path d="M9 5v2" /><path d="M9 13v3" /></Svg>;
export const HomeGlyph = (p) => <Svg {...p}><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></Svg>;
export const PantryGlyph = (p) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /></Svg>;
export const CupboardGlyph = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /><path d="M9 12h.01" /><path d="M15 12h.01" /></Svg>;
export const BoxGlyph = (p) => <Svg {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Svg>;
export const PlusGlyph = (p) => <Svg sw={2.4} {...p}><path d="M12 5v14" /><path d="M5 12h14" /></Svg>;
export const DoorGlyph = (p) => <Svg sw={2.2} {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></Svg>;
export const LeaveGlyph = (p) => <Svg sw={2.2} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Svg>;
export const LockGlyph = (p) => <Svg sw={2.2} size={16} {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>;
export const CheckGlyph = (p) => <Svg sw={3} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const ChevronDown = (p) => <Svg sw={2.4} {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const BackGlyph = (p) => <Svg sw={2.4} {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const CloseGlyph = (p) => <Svg sw={2.4} size={22} {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></Svg>;
export const LinkGlyph = (p) => <Svg sw={2.2} {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></Svg>;
export const CopyGlyph = (p) => <Svg sw={2.2} {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Svg>;
export const RefreshGlyph = (p) => <Svg sw={2.4} {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></Svg>;
export const ClockGlyph = (p) => <Svg sw={2.2} size={16} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const InfoGlyph = (p) => <Svg sw={2.2} size={18} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Svg>;
export const CrownGlyph = (p) => <Svg sw={2.2} size={14} {...p}><path d="M3 18h18" /><path d="M4 8l4 4 4-7 4 7 4-4-2 10H6z" /></Svg>;
export const AlertGlyph = (p) => <Svg sw={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5h.01" /></Svg>;
export const UserPlusGlyph = (p) => <Svg sw={2.2} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6" /><path d="M22 11h-6" /></Svg>;

export function KitchenTile({ kitchen, size = '' }) {
  const shared = !kitchen || kitchen.type !== 'private';
  return (
    <span aria-hidden="true" className={'ktile ' + size} style={{ background: shared ? 'var(--sky)' : 'var(--butter)' }}>
      {shared ? <FridgeGlyph size={size === 'xl' ? 28 : 20} /> : <HomeGlyph size={size === 'xl' ? 28 : 20} />}
    </span>
  );
}

// Storage spot look (Main mockup): Fridge sky, Pantry butter, Cupboard lilac.
export function spotStyle(name) {
  const n = String(name).toLowerCase();
  if (n.includes('fridge') || n.includes('freez')) return { bg: 'var(--sky)', Icon: FridgeGlyph };
  if (n.includes('pantry')) return { bg: 'var(--butter)', Icon: PantryGlyph };
  if (n.includes('cupboard')) return { bg: 'var(--lilac)', Icon: CupboardGlyph };
  return { bg: 'var(--mint)', Icon: BoxGlyph };
}

const AVATARS = ['#FFE28A', '#A9D8F0', '#C9B9F2', '#A8DDB5', '#FFE3E1', '#FFD1A8'];
export function avatarColor(id = '') {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATARS[h % AVATARS.length];
}
export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}
export function Avatar({ id, name, size = '' }) {
  return <span aria-hidden="true" className={'mav ' + size} style={{ background: avatarColor(id) }}>{initials(name)}</span>;
}

export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function kitchenMeta(k, uid) {
  if (!k) return '';
  const parts = [k.type === 'private' ? 'Private' : 'Shared', plural(k.memberCount || 1, 'member')];
  if (uid && k.ownerId === uid && k.type === 'shared') parts.push('You own it');
  return parts.join(' · ');
}

// Firestore Timestamp | Date | ms -> Date
export function toDate(t) {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (typeof t === 'number') return new Date(t);
  if (t instanceof Date) return t;
  if (typeof t.seconds === 'number') return new Date(t.seconds * 1000);
  return null;
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export function dayLabel(d) {
  if (!d) return 'Just now';
  const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Today';
  if (sameDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' });
}
export function shortDate(d) {
  if (!d) return 'today';
  return sameDay(d, new Date()) ? 'today' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
export function timeAgo(d) {
  if (!d) return 'just now';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400 && sameDay(d, new Date())) return `${Math.floor(s / 3600)} h ago`;
  return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
}
export function expiresIn(ms) {
  const left = ms - Date.now();
  if (left <= 0) return 'Expired';
  const d = Math.floor(left / 864e5), h = Math.floor((left % 864e5) / 36e5), m = Math.floor((left % 36e5) / 6e4);
  if (d >= 1) return `Expires in ${d} d ${h} h`;
  if (h >= 1) return `Expires in ${h} h ${m} min`;
  return `Expires in ${m} min`;
}

// Accessible modal: Escape closes, focus moves in and returns after.
export function Dialog({ labelledBy, describedBy, onClose, children, width }) {
  const ref = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    const el = ref.current;
    const first = el && el.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
    (first || el).focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
      if (e.key === 'Tab' && el) {
        const items = [...el.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const [a, z] = [items[0], items[items.length - 1]];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (before && before.focus) before.focus(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1} className="dialog" style={width ? { maxWidth: width } : undefined}>
        {children}
      </div>
    </div>
  );
}
