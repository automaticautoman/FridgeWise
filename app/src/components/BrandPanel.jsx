import { LeafIcon } from './Icons';

const COPY = {
  signin: { tag: 'Made for shared kitchens', headline: 'Your kitchen, your little food universe.', sub: "See what's fresh, what's expiring and what you can cook tonight." },
  signup: { tag: 'One account each, one shared kitchen', headline: 'Hey, Chef! Pull up a chair.', sub: 'Track groceries with your housemates, get a nudge before food goes off, and waste less together.' },
  reset: { tag: 'Account help', headline: 'Happens to the best chefs.', sub: "We'll email you a 6-digit code and get you back to your kitchen in a minute." },
  check: { tag: 'Account help', headline: 'Almost there!', sub: 'Pop in the code from your inbox. Your groceries are right where you left them.' },
  done: { tag: 'All sorted', headline: 'Back in business!', sub: 'Your fridge missed you. Sign in and pick up where you left off.' },
  onboarding: { tag: 'Getting set up', headline: 'Let’s set up your kitchen.', sub: 'A minute now saves a lot of forgotten food later.' }
};

const dot = (s) => <div aria-hidden="true" style={{ position: 'absolute', borderRadius: '50%', ...s }} />;

function FloatCard({ style, tile, title, children }) {
  return (
    <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 12px 12px', borderRadius: 20, background: '#fff', boxShadow: '0 14px 28px rgba(61,53,51,0.14)', ...style }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: tile, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children[0]}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
        {children[1]}
      </div>
    </div>
  );
}

export default function BrandPanel({ variant = 'signin' }) {
  const c = COPY[variant] || COPY.signin;
  const s = { fill: 'none', stroke: '#3D3533', strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <div style={{ boxSizing: 'border-box', width: '100%', minHeight: 852, borderRadius: 36, background: '#A8DDB5', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 48px 48px', color: '#3D3533' }}>
      {dot({ top: -90, right: -90, width: 280, height: 280, background: '#FFE28A' })}
      {dot({ bottom: 150, left: -70, width: 180, height: 180, background: '#C9B9F2', opacity: 0.75 })}
      {dot({ top: 210, right: 56, width: 18, height: 18, background: '#FF7F79' })}
      {dot({ top: 120, left: 120, width: 12, height: 12, background: '#FFA552' })}
      {dot({ bottom: 260, right: 120, width: 14, height: 14, background: '#A9D8F0' })}

      <div style={{ position: 'relative', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 8px 12px', borderRadius: 999, background: '#fff', fontSize: 14, fontWeight: 800, color: '#2F7A4A' }}>
        <LeafIcon /> <span style={{ color: '#3D3533' }}>{c.tag}</span>
      </div>

      <div aria-hidden="true" style={{ position: 'relative', height: 440, margin: '16px 0' }}>
        <svg width="240" height="400" viewBox="0 0 240 400" {...s} strokeWidth="4" style={{ position: 'absolute', left: '50%', top: 16, marginLeft: -120 }}>
          <rect x="8" y="8" width="224" height="384" rx="32" fill="#FFFFFF" />
          <path d="M8 120h224" />
          <rect x="28" y="44" width="10" height="48" rx="5" fill="#3D3533" />
          <circle cx="192" cy="58" r="13" fill="#FFE28A" strokeWidth="3" />
          <circle cx="166" cy="86" r="8" fill="#FF7F79" strokeWidth="3" />
          <rect x="24" y="136" width="192" height="240" rx="18" fill="#FFF9F0" strokeWidth="3" />
          <path d="M24 216h192" strokeWidth="3" />
          <path d="M24 296h192" strokeWidth="3" />
          <path d="M44 158l8-14h18l8 14v56H44z" fill="#A9D8F0" strokeWidth="3" />
          <path d="M44 172h34" strokeWidth="3" />
          <ellipse cx="100" cy="200" rx="10" ry="13" fill="#FFFFFF" strokeWidth="3" />
          <ellipse cx="122" cy="200" rx="10" ry="13" fill="#FFFFFF" strokeWidth="3" />
          <rect x="148" y="172" width="38" height="42" rx="8" fill="#C9B9F2" strokeWidth="3" />
          <rect x="144" y="162" width="46" height="12" rx="4" fill="#FFA552" strokeWidth="3" />
          <circle cx="62" cy="273" r="20" fill="#FF7F79" strokeWidth="3" />
          <path d="M55 253c4-6 10-6 14 0" fill="#A8DDB5" strokeWidth="3" />
          <circle cx="101" cy="279" r="14" fill="#FF7F79" strokeWidth="3" />
          <path d="M134 294h62v-36z" fill="#FFE28A" strokeWidth="3" />
          <circle cx="62" cy="350" r="22" fill="#A8DDB5" strokeWidth="3" />
          <path d="M52 350c4-8 16-8 20 0" strokeWidth="3" />
          <path d="M106 354l62-16-58 30z" fill="#FFA552" strokeWidth="3" />
        </svg>

        <FloatCard style={{ left: 0, top: 40 }} tile="#A9D8F0" title="Milk, 1 L">
          <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M8 2h8v3l2 3v14H6V8l2-3z" /><path d="M6 12h12" /></svg>
          <span style={{ alignSelf: 'flex-start', padding: '2px 10px', borderRadius: 999, background: '#FFE28A', fontSize: 12, fontWeight: 800 }}>Use in 2 days</span>
        </FloatCard>
        <FloatCard style={{ right: 0, top: 170 }} tile="#FFE3E1" title="Tomatoes, 6">
          <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><circle cx="12" cy="14" r="7" /><path d="M12 7c0-2 1-3 3-4" /></svg>
          <span style={{ alignSelf: 'flex-start', padding: '2px 10px', borderRadius: 999, background: '#D6F0DC', fontSize: 12, fontWeight: 800 }}>Fresh</span>
        </FloatCard>
        <FloatCard style={{ left: 24, bottom: 0 }} tile="#C9B9F2" title="3 items to use this week">
          <svg width="22" height="22" viewBox="0 0 24 24" {...s} strokeWidth="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#6B6663' }}>2 recipes can use them up</span>
        </FloatCard>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 46, lineHeight: 1.05, fontWeight: 800, letterSpacing: -0.5 }}>{c.headline}</h2>
        <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, fontWeight: 600 }}>{c.sub}</p>
      </div>
    </div>
  );
}
