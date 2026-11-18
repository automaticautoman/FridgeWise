// Epic 3 screens, part 1: Home inventory (Main mockup), Add item (AddItem +
// AddCustom mockups) and Quick-add (QuickAdd mockup).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/Layouts';
import { ErrorAlert } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { friendlyError } from '../auth/errors';
import { useKitchens } from '../kitchen/KitchenProvider';
import { KitchenLayout } from '../kitchen/KitchenLayout';
import { spotStyle, plural, BackGlyph, PlusGlyph, CheckGlyph, Svg } from '../kitchen/kitchenUi';
import { useItems, useMembers, ExpiryBadge, OwnerBadge, LevelBars, expiryInfo, keepsAbout, Stepper } from '../kitchen/itemUi';
import { CATALOG, searchCatalog, closest, nameKey } from '../lib/catalog';
import { addItem, addMany, undoAdd, defaultsFor, groupItems, byExpiry, watchMyItems } from '../lib/items';
import { formatAmount, LEVEL_LABEL } from '../lib/units';
import { WithKitchen } from './KitchenPages';

export const itemLink = (g) => `/kitchen/items/${encodeURIComponent(g.key)}`;

const ClockGlyph = (p) => <Svg sw={2.2} {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M10 2h4" /></Svg>;
const CartGlyph = (p) => <Svg sw={2.2} size={18} {...p}><circle cx="8" cy="20.5" r="1.5" /><circle cx="18" cy="20.5" r="1.5" /><path d="M2 3h2.5l2.6 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.5L21.5 8H5.6" /></Svg>;
const ChefGlyph = (p) => <Svg sw={2.2} size={18} {...p}><path d="M6 13.9A4 4 0 0 1 7.4 6a5 5 0 0 1 9.2 0A4 4 0 0 1 18 13.9V21H6z" /><path d="M6 17h12" /></Svg>;
const SearchGlyph = (p) => <Svg sw={2.4} size={22} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>;
const ListGlyph = (p) => <Svg sw={2.2} size={18} {...p}><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></Svg>;
const UndoGlyph = (p) => <Svg sw={2.4} size={16} {...p}><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></Svg>;
const ChevronRight = () => <Svg sw={2.4} size={18} style={{ color: 'var(--line)', flexShrink: 0 }}><path d="M9 6l6 6-6 6" /></Svg>;
const BoxQuestion = (p) => <Svg sw={2} size={26} {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /></Svg>;

// ---------- F28 Home: use these soon + everything by spot ----------

export function InventoryHome() {
  return <WithKitchen><KitchenLayout tab="items"><InventoryBody /></KitchenLayout></WithKitchen>;
}

function groupSub(g) {
  if (g.mode === 'level') return 'Tracked by level';
  const amount = formatAmount({ mode: 'amount', amount: g.total, unit: g.unit, noun: g.noun });
  if (g.batches.length < 2) return amount;
  const e = expiryInfo(g.expiry);
  const when = e.d === null ? '' : e.d < 0 ? ' · earliest expired' : e.d === 0 ? ' · earliest today' : e.d === 1 ? ' · earliest tomorrow' : ` · earliest in ${e.label}`;
  return `${amount} · ${g.batches.length} batches${when}`;
}

function InventoryBody() {
  const { user } = useAuth();
  const { active } = useKitchens();
  const items = useItems(active.id);
  const members = useMembers(active.id);
  const [loc, setLoc] = useState('all');
  const [own, setOwn] = useState('all');
  const spots = active.locations && active.locations.length ? active.locations : ['Fridge', 'Pantry', 'Cupboard'];
  const groups = useMemo(() => groupItems(items || []), [items]);
  const shared = active.type === 'shared';

  // F33 (simple version until Epic 4): expired or expiring within 3 days, soonest first.
  const soon = groups.filter((g) => { const d = expiryInfo(g.expiry).d; return d !== null && d <= 3; }).sort((a, b) => byExpiry(a, b));
  const others = members.filter((m) => m.id !== user.uid);
  const filtered = groups.filter((g) => (loc === 'all' || g.location === loc)
    && (own === 'all' || (own === 'shared' ? g.shared : own === 'mine' ? (!g.shared && g.ownerId === user.uid) : (!g.shared && g.ownerId === own))));
  const extraSpots = [...new Set(groups.map((g) => g.location))].filter((s) => !spots.includes(s));
  const sections = [...spots, ...extraSpots].map((s) => ({ spot: s, list: filtered.filter((g) => g.location === s).sort(byExpiry) })).filter((s) => s.list.length);

  if (!items) return <div role="status" aria-label="Loading" style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>;

  if (!groups.length) {
    return (
      <section className="card" style={{ marginTop: 28, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
        <h1 className="h2" style={{ fontSize: 32 }}>Nothing in {active.name} yet</h1>
        <p className="lead" style={{ margin: 0 }}>Add what's in the fridge, pantry and cupboard. Known items take one tap.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <Link to="/kitchen/add" className="btn btn-primary btn-sm" style={{ height: 52 }}><PlusGlyph size={18} /> Add item</Link>
          <Link to="/kitchen/add/quick" className="btn btn-secondary btn-sm" style={{ height: 52 }}><ListGlyph /> Add lots at once</Link>
        </div>
      </section>
    );
  }

  return (
    <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section aria-labelledby="exp-h" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 id="exp-h" className="h2" style={{ fontSize: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span aria-hidden="true" className="ktile sm" style={{ background: 'var(--coral-tint)' }}><ClockGlyph /></span>Use these soon
          </h1>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/soon/shopping" className="pill" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 14 }}><CartGlyph /> Grocery list</Link>
            <Link to="/soon/recipes" className="pill" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 14 }}><ChefGlyph /> Recipes for these</Link>
          </div>
        </div>
        {soon.length === 0 ? (
          <p className="small" style={{ margin: 0, fontSize: 15 }}>Nothing is about to expire. Nice.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {soon.map((g) => (
              <Link key={g.key} to={itemLink(g)} className="soon-card">
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
      </section>

      <section aria-labelledby="inv-h" className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h2 id="inv-h" className="h2">Everything in the kitchen</h2>
          <Link to="/kitchen/removed" style={{ padding: '6px 0', fontSize: 14 }}>Recently removed</Link>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          <div role="tablist" aria-label="Storage" className="seg" style={{ flexWrap: 'wrap', borderRadius: 24 }}>
            {[['all', `All ${groups.length}`], ...spots.map((s) => [s, `${s} ${groups.filter((g) => g.location === s).length}`])].map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={loc === id} aria-checked={loc === id} style={{ flex: 'none', height: 40, padding: '0 16px', fontSize: 14 }} onClick={() => setLoc(id)}>{label}</button>
            ))}
          </div>
          {shared && (
            <div role="group" aria-label="Owner" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[['all', 'Everyone'], ['mine', 'Yours'], ['shared', 'Shared'], ...others.map((m) => [m.id, m.name.split(' ')[0]])].map(([id, label]) => (
                <button key={id} type="button" className="filter-btn" style={{ height: 40, padding: '0 14px' }} aria-pressed={own === id} onClick={() => setOwn(id)}>{label}</button>
              ))}
            </div>
          )}
        </div>
        {sections.length === 0 && <p className="small" style={{ fontSize: 15 }}>Nothing matches these filters.</p>}
        {sections.map((s) => (
          <div key={s.spot} style={{ display: 'flex', flexDirection: 'column' }}>
            <h3 className="feed-day" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: spotStyle(s.spot).bg }} />
              {s.spot} · {plural(s.list.length, 'item')}
            </h3>
            {s.list.map((g) => (
              <Link key={g.key} to={itemLink(g)} className="inv-row">
                <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 800 }}>{g.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{groupSub(g)}</span>
                </span>
                {g.mode === 'level' && <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800 }}><LevelBars level={g.level} />{LEVEL_LABEL[g.level]}</span>}
                {shared && <OwnerBadge item={g.first} members={members} />}
                <ExpiryBadge expiry={g.expiry} wide />
                <ChevronRight />
              </Link>
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}

// ---------- F14/F15/F16 Add item ----------

const STAPLES = ['eggs', 'milk', 'bread', 'onions', 'chicken', 'yoghurt'];
const metaFor = (e, spot) => [e.category, spot, e.mode === 'level' ? 'by level' : formatAmount({ mode: 'amount', amount: e.amount, unit: e.unit, noun: e.noun }), keepsAbout(e.shelfDays)].filter(Boolean).join(' · ');
const tileFor = (e) => spotStyle(e.location || '').bg;
const titleCase = (s) => s.replace(/\s+/g, ' ').trim().replace(/^./, (c) => c.toUpperCase());

// null until loaded.
function useMyItems() {
  const { user } = useAuth();
  const [mine, setMine] = useState(null);
  useEffect(() => watchMyItems(user.uid, setMine, () => setMine([])), [user.uid]);
  return mine;
}
const myAsEntry = (m) => ({ ...m, id: m.catalogId || `my:${m.id}`, mine: true });

export function AddItem() {
  return <WithKitchen><AddItemBody /></WithKitchen>;
}

function AddItemBody() {
  const { user, profile } = useAuth();
  const { active } = useKitchens();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [added, setAdded] = useState({}); // entry id -> { id, activityId, item }
  const [error, setError] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customSpot, setCustomSpot] = useState(null);
  const mineLive = useMyItems();
  const mine = mineLive || [];
  const input = useRef(null);
  const spots = active.locations && active.locations.length ? active.locations : ['Fridge', 'Pantry', 'Cupboard'];
  // Chosen once when the screen opens, so chips don't move while you tap them.
  const [recent, setRecent] = useState(null);
  useEffect(() => {
    if (recent || !mineLive) return;
    // S5 wireframe: "Recent" (last added) and "Frequent" (added most) rows.
    const own = mineLive.filter((m) => (m.count || 0) > 0);
    const ms = (m) => (m.lastAddedAt && m.lastAddedAt.toMillis ? m.lastAddedAt.toMillis() : 0);
    const recentList = [...own].sort((a, b) => ms(b) - ms(a)).slice(0, 4);
    const frequentList = own.filter((m) => !recentList.includes(m) && (m.count || 0) > 1).slice(0, 4);
    const used = new Set([...recentList, ...frequentList].map((m) => nameKey(m.name)));
    const popular = STAPLES.map((id) => CATALOG.find((c) => c.id === id)).filter((c) => !used.has(nameKey(c.name)))
      .slice(0, Math.max(0, 6 - recentList.length - frequentList.length));
    setRecent({ rows: [
      ['Recent', recentList.map(myAsEntry)],
      ['Frequent', frequentList.map(myAsEntry)],
      [own.length ? 'Popular' : 'Popular items', popular]
    ].filter(([, list]) => list.length) });
  }, [mineLive, recent]);

  useEffect(() => { setParams(q ? { q } : {}, { replace: true }); setCustomOpen(false); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = q.trim() ? searchCatalog(q, mine.map(myAsEntry)).slice(0, 8) : [];
  const showCustom = q.trim() && (results.length === 0 || customOpen);
  const suggestion = results.length === 0 ? closest(q) : null;

  const toggle = async (entry) => {
    setError(null);
    const done = added[entry.id];
    try {
      if (done) {
        setAdded((a) => { const n = { ...a }; delete n[entry.id]; return n; });
        await undoAdd(active, user, done, done.item);
      } else {
        const item = defaultsFor(entry, active, user);
        setAdded((a) => ({ ...a, [entry.id]: { pending: true, item } }));
        const res = await addItem(active, user, profile, item);
        setAdded((a) => ({ ...a, [entry.id]: { ...res, item } }));
      }
    } catch (e) {
      setError(friendlyError(e));
      setAdded((a) => { const n = { ...a }; if (!done) delete n[entry.id]; return n; });
    }
  };

  const customName = titleCase(q);
  const customLoc = customSpot || spots[0];
  const addCustom = async () => {
    setError(null);
    try {
      await addItem(active, user, profile, {
        name: customName, category: 'Other', location: customLoc, mode: 'amount', amount: 1, unit: 'pieces',
        expiry: null, dateType: 'best-before', ownerId: user.uid, shared: false
      }, { custom: true });
      navigate('/kitchen');
    } catch (e) { setError(friendlyError(e)); }
  };

  return (
    <AppLayout>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Link to="/kitchen" className="back"><BackGlyph /> Home</Link>
          <Link to="/kitchen/add/quick" className="pill" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 14 }}><ListGlyph /> Add lots at once</Link>
        </div>
        <h1 className="title" style={{ fontSize: 40, marginTop: 12 }}>What did you get?</h1>
        <div style={{ marginTop: 20, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 18, top: 19, color: 'var(--muted)', display: 'flex' }}><SearchGlyph /></span>
          <label htmlFor="q" className="sr-only">Search items</label>
          <input id="q" ref={input} type="search" autoComplete="off" autoFocus className="search-input" value={q} placeholder="Milk, eggs, daal…" onChange={(e) => setQ(e.target.value)} />
        </div>
        {error && <div style={{ marginTop: 16 }}><ErrorAlert>{error}</ErrorAlert></div>}

        {recent && recent.rows.map(([title, list], i) => (
          <section key={title} aria-labelledby={`rec-h${i}`} style={{ marginTop: i ? 14 : 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 id={`rec-h${i}`} className="feed-day" style={{ margin: 0 }}>{title}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {list.map((c) => {
                const on = !!added[c.id];
                return (
                  <button key={c.id} type="button" className="chip" aria-pressed={on} aria-label={on ? `${c.name} added. Undo` : `Add ${c.name}`} onClick={() => toggle(c)}>
                    <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>{on ? '✓' : '+'}</span>{c.name}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {q.trim() && results.length > 0 && (
          <section aria-labelledby="res-h" className="card" style={{ marginTop: 24, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h2 id="res-h" className="feed-day" style={{ margin: '6px 10px 8px' }}>{plural(results.length, 'match', 'matches')} for “{q.trim()}”</h2>
            {results.map((r) => {
              const on = added[r.id];
              const spot = defaultsFor(r, active, user).location;
              const detailsQ = r.mine && !r.catalogId ? `my=${encodeURIComponent(r.id.slice(3))}` : `from=${encodeURIComponent(r.id)}`;
              return (
                <div key={r.id} className="result-row" style={{ background: on ? '#EAF7EE' : 'transparent' }}>
                  <span aria-hidden="true" className="ktile" style={{ width: 48, height: 48, background: tileFor(r), fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800 }}>{r.name.charAt(0)}</span>
                  <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{r.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{metaFor(r, spot)}</span>
                  </span>
                  <Link to={`/kitchen/item/new?${detailsQ}`} style={{ flexShrink: 0, padding: '10px 8px', fontSize: 14 }}>Details</Link>
                  {on ? (
                    <button type="button" className="add-btn undo" onClick={() => toggle(r)} disabled={on.pending}><UndoGlyph /> Undo</button>
                  ) : (
                    <button type="button" className="add-btn" aria-label={`Add ${r.name}`} onClick={() => toggle(r)}><PlusGlyph size={16} /> Add</button>
                  )}
                </div>
              );
            })}
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', margin: '4px 10px 6px', fontSize: 14 }} onClick={() => setCustomOpen(true)}>Not what you're looking for? Create your own item</button>
          </section>
        )}

        {showCustom && (
          <section aria-labelledby="none-h" className="card" style={{ marginTop: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span aria-hidden="true" className="ktile" style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--butter)' }}><BoxQuestion /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <h2 id="none-h" className="h2" style={{ fontSize: 24 }}>{results.length ? `Add “${customName}” as your own item` : `“${q.trim()}” isn't in our list yet`}</h2>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>No problem. Add it as your own item.</span>
              </div>
            </div>
            <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Where does it go?</legend>
              <div role="radiogroup" aria-label="Where does it go?" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {spots.map((s) => <button key={s} type="button" role="radio" aria-checked={customLoc === s} aria-pressed={customLoc === s} className="pill" onClick={() => setCustomSpot(s)}>{s}</button>)}
              </div>
            </fieldset>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button type="button" className="btn btn-primary" style={{ flex: '1 1 240px', height: 54, fontSize: 16 }} onClick={addCustom}><PlusGlyph size={18} /> Add “{customName}” to {customLoc}</button>
              <Link to={`/kitchen/item/new?name=${encodeURIComponent(customName)}&location=${encodeURIComponent(customLoc)}`} className="btn btn-secondary" style={{ height: 54, fontSize: 16 }}>Add details first</Link>
            </div>
            <span className="small">It'll show up in “You often add” next time. No expiry date is set unless you add one.</span>
          </section>
        )}
        {showCustom && suggestion && !results.length && (
          <p style={{ margin: '18px 4px 0', fontSize: 15, color: 'var(--muted)' }}>Did you mean <button type="button" className="link-btn" onClick={() => setQ(suggestion.name)}>{suggestion.name}</button>?</p>
        )}

        <p style={{ margin: '16px 4px 0', fontSize: 14, lineHeight: 1.5, color: 'var(--muted)' }}>Add puts it in its usual spot with its usual amount and shelf life. Tap Details to change anything.</p>
      </div>
    </AppLayout>
  );
}

// ---------- F29 Quick-add ----------

export function QuickAdd() {
  return <WithKitchen><QuickAddBody /></WithKitchen>;
}

const QUICK = ['milk', 'eggs', 'bread', 'onions', 'tomatoes', 'chicken', 'yoghurt', 'potatoes', 'naan', 'bananas'];

function QuickAddBody() {
  const { user, profile } = useAuth();
  const { active } = useKitchens();
  const navigate = useNavigate();
  const mine = useMyItems() || [];
  const [sel, setSel] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // S6 wireframe: "Search to add more" right here. Picked items go to the top, ticked.
  const [q, setQ] = useState('');
  const [extra, setExtra] = useState([]);
  const matches = q.trim() ? searchCatalog(q, mine.map(myAsEntry)).slice(0, 5) : [];
  const pick = (e) => {
    if (!extra.some((x) => x.id === e.id)) setExtra((x) => [e, ...x]);
    setSel((s) => ({ ...s, [e.id]: s[e.id] || 1 }));
    setQ('');
  };

  const rows = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const e of [...extra, ...mine.filter((m) => (m.count || 0) > 0).map(myAsEntry), ...QUICK.map((id) => CATALOG.find((c) => c.id === id))]) {
      const k = nameKey(e.name);
      if (seen.has(k) || out.length >= 12 + extra.length) continue;
      seen.add(k); out.push(e);
    }
    return out;
  }, [mine, extra]);

  const upd = (id, v) => setSel((s) => { const n = { ...s }; if (v > 0) n[id] = v; else delete n[id]; return n; });
  const kinds = Object.keys(sel).length;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const list = rows.filter((r) => sel[r.id]).map((r) => {
        const d = defaultsFor(r, active, user);
        if (d.mode === 'amount') d.amount *= sel[r.id];
        return d;
      });
      await addMany(active, user, profile, list);
      navigate('/kitchen');
    } catch (e) { setError(friendlyError(e)); setBusy(false); }
  };

  return (
    <AppLayout>
      <div style={{ width: '100%', maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Link to="/kitchen/add" className="back"><BackGlyph /> Back</Link>
        <h1 className="title" style={{ fontSize: 40, marginTop: 12 }}>Back from the shop?</h1>
        <p className="lead">Tick what you bought and add it all in one go.</p>
        {error && <div style={{ marginTop: 16 }}><ErrorAlert>{error}</ErrorAlert></div>}
        <div style={{ marginTop: 20, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 18, top: 19, color: 'var(--muted)', display: 'flex' }}><SearchGlyph /></span>
          <label htmlFor="qa-search" className="sr-only">Search to add more</label>
          <input id="qa-search" type="search" autoComplete="off" className="search-input" style={{ boxShadow: 'none', border: '1.5px solid var(--line)' }}
            placeholder="Search to add more" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { e.preventDefault(); pick(matches[0]); } }} />
          {matches.length > 0 && (
            <ul role="listbox" aria-label="Matches" className="qa-matches">
              {matches.map((m) => (
                <li key={m.id}><button type="button" role="option" aria-selected="false" onClick={() => pick(m)}>
                  <PlusGlyph size={16} /> {m.name} <span className="small">· {defaultsFor(m, active, user).location}</span>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        <section aria-label="Items" className="card" style={{ marginTop: 16, padding: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((r) => {
            const n = sel[r.id] || 0;
            const on = n > 0;
            const spot = defaultsFor(r, active, user).location;
            const each = r.mode === 'level' ? 'by level' : formatAmount({ mode: 'amount', amount: r.amount, unit: r.unit, noun: r.noun });
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, minHeight: 60, padding: '6px 10px', borderRadius: 16, background: on ? 'var(--error-tint)' : 'transparent' }}>
                <label style={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, minHeight: 48, cursor: 'pointer' }}>
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => upd(r.id, on ? 0 : 1)} />
                  <span aria-hidden="true" className="tickbox" data-on={on}>{on && <CheckGlyph size={16} style={{ color: '#fff' }} />}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{r.name}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{on ? spot : `${each} · ${spot}`}{active.type === 'shared' ? ' · Mine' : ''}</span>
                  </span>
                </label>
                {on && r.mode !== 'level' && (
                  <div role="group" aria-label={`How many ${r.name}`} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999, background: '#fff', border: '1.5px solid #D9D2CB' }}>
                    <button type="button" className="step-btn" aria-label="Less" onClick={() => upd(r.id, n - 1)}>−</button>
                    <span style={{ minWidth: 64, textAlign: 'center', fontSize: 15, fontWeight: 800 }}>{formatAmount({ mode: 'amount', amount: r.amount * n, unit: r.unit, noun: r.noun })}</span>
                    <button type="button" className="step-btn" aria-label="More" onClick={() => upd(r.id, n + 1)}>+</button>
                  </div>
                )}
              </div>
            );
          })}
          <Link to="/kitchen/add" style={{ margin: '6px 10px', padding: '8px 0', fontSize: 14 }}>Need more detail? Add one item at a time</Link>
        </section>
        <div className="quick-bar">
          <span style={{ fontSize: 15, fontWeight: 700 }}>{kinds === 0 ? 'Nothing ticked yet' : `${plural(kinds, 'item')} ticked`}</span>
          <button type="button" className="btn btn-primary" style={{ height: 50, fontSize: 16 }} disabled={!kinds || busy} onClick={save}>
            {busy ? <span className="spinner" /> : kinds ? `Add ${plural(kinds, 'item')}` : 'Add items'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

