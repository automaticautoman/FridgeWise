const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const FridgeIcon = ({ size = 24, sw = 2.2 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth={sw}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M6 10h12" /><path d="M9.5 5v2" /><path d="M9.5 13v3" /></svg>
);
export const EyeIcon = ({ off }) => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 20L20 4" />}</svg>
);
export const BackIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.4"><path d="M15 18l-6-6 6-6" /></svg>
);
export const ArrowIcon = () => (
  <svg {...base} width="20" height="20" viewBox="0 0 24 24" strokeWidth="2.4"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
);
export const CheckIcon = ({ size = 16, color = '#2F7A4A', sw = 3 }) => (
  <svg {...base} stroke={color} width={size} height={size} viewBox="0 0 24 24" strokeWidth={sw}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const CircleIcon = () => (
  <svg {...base} stroke="#898582" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /></svg>
);
export const AlertIcon = ({ size = 18 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" /><path d="M12 16v.01" /></svg>
);
export const KeyIcon = () => (
  <svg {...base} width="34" height="34" viewBox="0 0 24 24" strokeWidth="2"><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3L20 3" /><path d="M16 7l3 3" /><path d="M13.5 9.5l2.5 2.5" /></svg>
);
export const MailIcon = ({ size = 34 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3.5 7.5l8.5 6 8.5-6" /></svg>
);
export const ClockIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const ShieldIcon = () => (
  <svg {...base} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const LockIcon = () => (
  <svg {...base} width="24" height="24" viewBox="0 0 24 24" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
);
export const BellIcon = ({ size = 22 }) => (
  <svg {...base} width={size} height={size} viewBox="0 0 24 24" strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
export const ChevronIcon = () => (
  <svg {...base} stroke="#898582" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2.4"><path d="M9 6l6 6-6 6" /></svg>
);
export const SignOutIcon = () => (
  <svg {...base} width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
export const PeopleIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
export const HouseIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
);
export const DoorIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
);
export const LeafIcon = () => (
  <svg {...base} width="22" height="22" viewBox="0 0 24 24" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
);
export const WifiOffIcon = () => (
  <svg {...base} width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2"><path d="M2 2l20 20" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M5 12.9a10 10 0 0 1 5.2-2.7" /><path d="M19 12.9a10 10 0 0 0-2.3-1.6" /><path d="M12 20h.01" /></svg>
);
