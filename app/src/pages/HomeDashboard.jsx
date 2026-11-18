// Home, once you have a kitchen: a quick overview with the most urgent things
// first (FR3.17: expiring soon first; the full inventory is one tap away).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { useKitchens } from '../kitchen/KitchenProvider';
import { watchActivity } from '../lib/kitchens';
import { groupItems, byExpiry } from '../lib/items';
import { formatAmount, LEVEL_LABEL } from '../lib/units';
import { useItems, useMembers, ExpiryBadge, OwnerBadge, expiryInfo } from '../kitchen/itemUi';
import { KitchenTile, kitchenMeta, Avatar, plural, toDate, timeAgo, PlusGlyph, UserPlusGlyph, Svg } from '../kitchen/kitchenUi';

const ListGlyph = (p) => <Svg sw={2.2} size={18} {...p}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></Svg>;
const ClockGlyph = (p) => <Svg sw={2.2} {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" /></Svg>;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function HomeDashboard() {
  const { user, profile } = useAuth();
  const { active, kitchens, switchTo, canInvite } = useKitchens();
  const navigate = useNavigate();
  // Opening another kitchen makes it the current one, like the switcher.
  const open = async (k) => { if (k.id !== active.id) await switchTo(k.id); navigate('/kitchen'); };
  const items = useItems(active.id);
  const members = useMembers(active.id);
  const [recent, setRecent] = useState(null);
  useEffect(() => watchActivity(active.id, (list) => setRecent(list.filter((e) => e.type === 'item-added').slice(0, 4)), () => setRecent([]), 30), [active.id]);

  const first = ((profile && profile.name) || user.displayName || 'Chef').split(' ')[0];
  const groups = useMemo(() => groupItems(items || []), [items]);
  const soon = groups.filter((g) => { const d = expiryInfo(g.expiry).d; return d !== null && d <= 3; }).sort(byExpiry);
  const expired = soon.filter((g) => expiryInfo(g.expiry).d < 0).length;
  const shared = active.type === 'shared';

  return (
    <>
      <h1 className="title">{greeting()}, {first}!</h1>
      <p className="lead">
        {!items ? 'Checking your kitchen…'
          : soon.length ? `${plural(soon.length, 'thing')} to use soon${expired ? `, ${expired} already past ${expired === 1 ? 'its' : 'their'} date` : ''}.`
            : groups.length ? 'Nothing is about to expire. Nice.' : 'Your kitchen is empty. Add what you have to get started.'}
      </p>

      <section aria-labelledby="home-kitchens" style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 id="home-kitchens" className="feed-day" style={{ margin: 0 }}>{kitchens.length > 1 ? `Your kitchens (${kitchens.length})` : 'Your kitchen'}</h2>
        {[active, ...kitchens.filter((k) => k.id !== active.id)].map((k) => {
          const current = k.id === active.id;
          return (
            <div key={k.id} className="card" style={{ padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, outline: current && kitchens.length > 1 ? '2px solid var(--coral)' : 'none' }}>
              <KitchenTile kitchen={k} size={current ? 'xl' : 'lg'} />
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                <h3 className="h2" style={{ fontSize: current ? 26 : 22, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {k.name}{current && kitchens.length > 1 && <span className="badge" style={{ background: 'var(--coral-tint)', fontFamily: 'Nunito, sans-serif' }}>Current</span>}
                </h3>
                <p className="small" style={{ margin: '4px 0 0', fontSize: 15 }}>{kitchenMeta(k, user.uid)}{current && items ? ` · ${plural(groups.length, 'item')}` : ''}</p>
              </div>
              <button type="button" className={'btn btn-sm ' + (current ? 'btn-primary' : 'btn-secondary')} onClick={() => open(k)}>Open kitchen</button>
            </div>
          );
        })}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Link to="/kitchen/new" style={{ fontSize: 14 }}>Create a kitchen</Link>
          <Link to="/kitchen/join" style={{ fontSize: 14 }}>Join with a code</Link>
          <Link to="/kitchen/removed" style={{ fontSize: 14 }}>Recently removed</Link>
        </div>
      </section>

      <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Link to="/kitchen/add" className="pill" style={{ textDecoration: 'none', fontWeight: 800 }}><PlusGlyph size={16} /> Add item</Link>
        <Link to="/kitchen/add/quick" className="pill" style={{ textDecoration: 'none', fontWeight: 800 }}><ListGlyph /> Add lots at once</Link>
        {canInvite && <Link to="/kitchen/members?invite=1" className="pill" style={{ textDecoration: 'none', fontWeight: 800 }}><UserPlusGlyph size={16} /> Invite</Link>}
      </div>

      <section aria-labelledby="home-soon" style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 id="home-soon" className="h2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span aria-hidden="true" className="ktile sm" style={{ background: 'var(--coral-tint)' }}><ClockGlyph /></span>Use these soon{kitchens.length > 1 ? ` in ${active.name}` : ''}
        </h2>
        {items && soon.length === 0 && <p className="small" style={{ margin: 0, fontSize: 15 }}>Nothing is about to expire.</p>}
        {soon.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {soon.slice(0, 8).map((g) => (
              <Link key={g.key} to={`/kitchen/items/${encodeURIComponent(g.key)}`} className="soon-card">
                <ExpiryBadge expiry={g.expiry} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{g.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{g.mode === 'level' ? LEVEL_LABEL[g.level] : formatAmount({ mode: 'amount', amount: g.total, unit: g.unit, noun: g.noun })} · {g.location}</span>
                </span>
                {shared && <OwnerBadge item={g.first} members={members} />}
              </Link>
            ))}
          </div>
        )}
        {soon.length > 8 && <Link to="/kitchen" style={{ fontSize: 14 }}>See all {soon.length} in the kitchen</Link>}
      </section>

      <section aria-labelledby="home-recent" className="card" style={{ marginTop: 32, padding: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 id="home-recent" className="h2" style={{ fontSize: 24, marginBottom: 8 }}>Recently added</h2>
        {recent && recent.length === 0 && <p className="small" style={{ margin: 0, fontSize: 15 }}>Nothing added yet. <Link to="/kitchen/add">Add your first item</Link>.</p>}
        {(recent || []).map((e) => (
          <div key={e.id} className="mrow">
            <Avatar id={e.actorId} name={e.actorName} size="sm" />
            <span style={{ flexGrow: 1, minWidth: 0, fontSize: 15 }}><strong>{e.itemName}</strong>{e.quantity ? `, ${e.quantity}` : ''}{e.location ? ` · ${e.location}` : ''}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{e.actorId === user.uid ? 'You' : (e.actorName || '').split(' ')[0]} · {timeAgo(toDate(e.at))}</span>
          </div>
        ))}
      </section>
    </>
  );
}
