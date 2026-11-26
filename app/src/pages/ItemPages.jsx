// Epic 3 screens, part 2: item form (ItemForm mockup), item detail with
// batches and "Take some out" (ItemDetail mockup), Recently removed.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../components/Layouts';
import { ErrorAlert } from '../components/ui';
import { useAuth } from '../auth/AuthProvider';
import { friendlyError } from '../auth/errors';
import { useKitchens } from '../kitchen/KitchenProvider';
import { Dialog, spotStyle, plural, toDate, shortDate, BackGlyph, PlusGlyph, CheckGlyph, Svg } from '../kitchen/kitchenUi';
import { useItems, useMembers, OwnerBadge, LevelBars, expiryInfo, dateLine, keepsAbout, Stepper, ExtraFields } from '../kitchen/itemUi';
import { CATALOG, CATEGORIES, nameKey } from '../lib/catalog';
import {
  addItem, updateItem, deleteItem, setAmount, setLevel, takeOut, restore, undoRemoval, watchRemoved, watchMyItems,
  defaultsFor, groupKey, byExpiry, todayISO, REMOVED_DAYS
} from '../lib/items';
import { UNITS, STEP, START, LEVELS, LEVEL_LABEL, toBase, fromBase, entryUnit, savedAs, formatAmount, takeChoices } from '../lib/units';
import { WithKitchen } from './KitchenPages';

const itemLink = (key) => `/kitchen/items/${encodeURIComponent(key)}`;
const EditGlyph = (p) => <Svg sw={2.2} size={18} {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>;
const TrashGlyph = (p) => <Svg sw={2.2} size={18} {...p}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></Svg>;
const InfoGlyph = (p) => <Svg sw={2.2} size={16} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></Svg>;
const RestoreGlyph = (p) => <Svg sw={2.4} size={16} {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Svg>;

function Loading() {
  return <AppLayout><div role="status" aria-label="Loading" style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div></AppLayout>;
}

// ---------- F18/F20/F21/F22/F23 Item form ----------

export function NewItem() { return <WithKitchen><ItemForm /></WithKitchen>; }
export function EditItem() { return <WithKitchen><ItemForm editing /></WithKitchen>; }

function ItemForm({ editing = false }) {
  const { user, profile } = useAuth();
  const { active } = useKitchens();
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const items = useItems(active.id);
  const members = useMembers(active.id);
  const [mine, setMine] = useState(null);
  useEffect(() => watchMyItems(user.uid, setMine, () => setMine([])), [user.uid]);

  // Where the starting values come from.
  const source = useMemo(() => {
    if (editing) return items ? items.find((i) => i.id === id) || 'missing' : null;
    const group = params.get('group');
    if (group) {
      if (!items) return null;
      const b = items.find((i) => groupKey(i) === group);
      if (!b) return 'missing';
      const cat = CATALOG.find((c) => c.id === b.catalogId);
      return { ...b, amount: b.amount, level: b.mode === 'level' ? 'full' : null, expiry: cat && cat.shelfDays ? todayISO(cat.shelfDays) : null, note: '' };
    }
    const from = params.get('from');
    if (from) { const c = CATALOG.find((x) => x.id === from); return c ? defaultsFor(c, active, user) : 'missing'; }
    const my = params.get('my');
    if (my) { if (!mine) return null; const m = mine.find((x) => x.id === my); return m ? defaultsFor(m, active, user) : 'missing'; }
    return defaultsFor({ name: params.get('name') || '', location: params.get('location'), mode: 'amount', amount: 1, unit: 'pieces',
      brand: params.get('brand') || null, calories: params.get('calories') || null }, active, user);
  }, [editing, id, items, mine, params, active, user]);

  if (!source) return <Loading />;
  if (source === 'missing') {
    return (
      <AppLayout>
        <h1 className="title">That item isn't here any more</h1>
        <p className="lead">Someone may have used it up or removed it.</p>
        <Link to="/kitchen" className="btn btn-primary btn-sm" style={{ marginTop: 20, alignSelf: 'flex-start' }}>Back to the kitchen</Link>
      </AppLayout>
    );
  }
  return <ItemFormBody key={source.id || 'new'} source={source} editing={editing} kitchen={active} user={user} profile={profile} members={members} navigate={navigate} />;
}

function ItemFormBody({ source, editing, kitchen, user, profile, members, navigate }) {
  const spots = kitchen.locations && kitchen.locations.length ? kitchen.locations : ['Fridge', 'Pantry', 'Cupboard'];
  const cat = CATALOG.find((c) => c.id === source.catalogId);
  const startUnit = source.mode === 'level' ? (source.unit === 'pieces' ? 'pieces' : source.unit) : entryUnit(Number(source.amount) || 0, source.unit);
  const [f, setF] = useState({
    name: source.name || '',
    mode: source.mode || 'amount',
    value: source.mode === 'level' ? START[startUnit] : fromBase(Number(source.amount) || 1, startUnit),
    unit: startUnit,
    noun: source.noun || null,
    level: source.level || 'half',
    expiry: source.expiry || '',
    dateType: source.dateType || 'best-before',
    category: source.category || 'Other',
    location: spots.includes(source.location) ? source.location : spots[0],
    owner: source.shared ? 'shared' : source.ownerId === user.uid || !source.ownerId ? 'mine' : source.ownerId,
    note: source.note || '',
    brand: source.brand || '',
    calories: source.calories ?? ''
  });
  const [someoneElse, setSomeoneElse] = useState(!['mine', 'shared'].includes(f.owner));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const shared = kitchen.type === 'shared';
  const others = members.filter((m) => m.id !== user.uid);
  const conv = f.mode === 'amount' ? savedAs(f.value, f.unit) : null;
  const shelf = cat ? cat.shelfDays : null;

  const fields = () => {
    const base = f.mode === 'amount' ? toBase(f.value, f.unit) : { amount: null, unit: f.unit === 'kg' ? 'g' : f.unit === 'l' ? 'ml' : f.unit };
    return {
      name: f.name, catalogId: nameKey(f.name) === nameKey(source.name || '') ? source.catalogId || null : null,
      category: f.category, location: f.location, mode: f.mode,
      amount: base.amount, unit: base.unit, noun: base.unit === 'pieces' ? f.noun : null, level: f.mode === 'level' ? f.level : null,
      expiry: f.expiry || null, dateType: f.dateType,
      ownerId: f.owner === 'mine' || f.owner === 'shared' ? (editing && source.ownerId && f.owner === 'shared' ? source.ownerId : user.uid) : f.owner,
      shared: f.owner === 'shared', note: f.note, brand: f.brand, calories: f.calories
    };
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) { setError('Give the item a name.'); return; }
    if (f.mode === 'amount' && !(Number(f.value) > 0)) { setError('Enter how much there is.'); return; }
    setBusy(true); setError(null);
    try {
      const data = fields();
      if (editing) await updateItem(kitchen, user, profile, source.id, data);
      else await addItem(kitchen, user, profile, data, { custom: !data.catalogId });
      navigate(itemLink(groupKey({ ...data, nameKey: nameKey(data.name) })), { replace: true });
    } catch (err) { setError(friendlyError(err)); setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    try { await deleteItem(kitchen, user, profile, source); navigate('/kitchen', { replace: true }); }
    catch (err) { setError(friendlyError(err)); setBusy(false); setConfirmDelete(false); }
  };

  const pickUnit = (u) => setF((x) => ({ ...x, unit: u, value: START[u], noun: u === 'pieces' ? x.noun : null }));

  return (
    <AppLayout>
      <div style={{ width: '100%', maxWidth: 620, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="back link-plain" onClick={() => navigate(-1)}><BackGlyph /> Back</button>
        <form className="card" style={{ marginTop: 12, padding: 36, borderRadius: 28, display: 'flex', flexDirection: 'column', gap: 26 }} onSubmit={save} noValidate>
          <h1 className="title" style={{ fontSize: 36 }}>{editing ? 'Edit item' : 'Item details'}</h1>
          {error && <ErrorAlert id="form-error">{error}</ErrorAlert>}
          <div className="field">
            <label htmlFor="iname" className="label">Name <span style={{ color: 'var(--error)' }} aria-hidden="true">*</span><span className="sr-only"> required</span></label>
            <input id="iname" className="input" type="text" required maxLength={60} value={f.name} onChange={(e) => set('name', e.target.value)}
              aria-invalid={error && !f.name.trim() ? 'true' : undefined} autoFocus={!f.name} />
          </div>

          <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <legend className="label" style={{ padding: 0, marginBottom: 10 }}>How much is there?</legend>
            <div role="radiogroup" aria-label="Track by" className="seg" style={{ alignSelf: 'flex-start' }}>
              <button type="button" role="radio" aria-checked={f.mode === 'amount'} style={{ padding: '0 18px', height: 40 }} onClick={() => set('mode', 'amount')}>Amount</button>
              <button type="button" role="radio" aria-checked={f.mode === 'level'} style={{ padding: '0 18px', height: 40 }} onClick={() => set('mode', 'level')}>Roughly (level)</button>
            </div>
            {f.mode === 'amount' ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  <Stepper value={Number(f.value) || 0} onChange={(v) => set('value', v)} step={STEP[f.unit]} size={44} inputWidth={72}
                    unit={f.unit === 'pieces' && f.noun ? f.noun : undefined} />
                  <div role="radiogroup" aria-label="Unit" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {UNITS.map((u) => <button key={u} type="button" role="radio" aria-checked={f.unit === u} className="unit-btn" onClick={() => pickUnit(u)}>{u}</button>)}
                  </div>
                </div>
                {conv && <span role="status" className="badge" style={{ alignSelf: 'flex-start', height: 32, background: '#E3F3FB', color: '#1D5470', fontSize: 14 }}><InfoGlyph /> Saved as {conv}</span>}
              </>
            ) : (
              <>
                <div role="radiogroup" aria-label="Level" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {LEVELS.map((l) => (
                    <button key={l} type="button" role="radio" aria-checked={f.level === l} className="level-btn" onClick={() => set('level', l)}>
                      <LevelBars level={l} w={16} />{LEVEL_LABEL[l]}
                    </button>
                  ))}
                </div>
                <span className="small">Good for things you scoop out, like rice, flour or sugar.</span>
              </>
            )}
          </fieldset>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="exp" className="label">Expiry date</label>
              <input id="exp" className="input" type="date" style={{ height: 52 }} value={f.expiry} onChange={(e) => set('expiry', e.target.value)} />
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {shelf ? `Suggested: ${keepsAbout(shelf)}. ` : ''}Leave empty if there's none.
                {f.expiry && <> <button type="button" className="link-btn" style={{ fontSize: 13, padding: 0 }} onClick={() => set('expiry', '')}>Clear date</button></>}
              </span>
            </div>
            <div className="field">
              <label htmlFor="dtype" className="label">Date on the pack</label>
              <select id="dtype" className="input" style={{ height: 52 }} value={f.dateType} onChange={(e) => set('dateType', e.target.value)}>
                <option value="best-before">Best before</option>
                <option value="use-by">Use by</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="cat" className="label">Category</label>
              <select id="cat" className="input" style={{ height: 52 }} value={f.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="loc" className="label">Where</label>
              <select id="loc" className="input" style={{ height: 52 }} value={f.location} onChange={(e) => set('location', e.target.value)}>
                {spots.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {shared && (
            <fieldset style={{ margin: 0, padding: 0, border: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <legend className="label" style={{ padding: 0, marginBottom: 10 }}>Whose is it?</legend>
              <div role="radiogroup" aria-label="Owner" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" role="radio" aria-checked={f.owner === 'mine'} className="pill" onClick={() => { set('owner', 'mine'); setSomeoneElse(false); }}>Mine</button>
                <button type="button" role="radio" aria-checked={f.owner === 'shared'} className="pill" onClick={() => { set('owner', 'shared'); setSomeoneElse(false); }}>Shared</button>
                {others.length > 0 && <button type="button" role="radio" aria-checked={someoneElse} className="pill" onClick={() => { setSomeoneElse(true); set('owner', others[0].id); }}>Someone else…</button>}
              </div>
              {someoneElse && (
                <div role="radiogroup" aria-label="Whose" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {others.map((m) => <button key={m.id} type="button" role="radio" aria-checked={f.owner === m.id} className="pill" onClick={() => set('owner', m.id)}>{m.name}</button>)}
                </div>
              )}
              <span className="small">Shared items are everyone's. Personal items leave with their owner.</span>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="note" className="label">Note <span style={{ fontWeight: 600, color: 'var(--muted)' }}>(optional)</span></label>
            <input id="note" className="input" type="text" maxLength={200} style={{ height: 52 }} placeholder="e.g. for Friday's biryani" value={f.note} onChange={(e) => set('note', e.target.value)} />
          </div>

          <ExtraFields value={{ brand: f.brand, calories: f.calories }} onChange={(v) => setF((x) => ({ ...x, brand: v.brand, calories: v.calories }))} idPrefix="item" />

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12 }}>
            {editing && <button type="button" className="ghost-btn danger-text" style={{ height: 52, marginRight: 'auto' }} onClick={() => setConfirmDelete(true)}><TrashGlyph /> Delete (added by mistake)</button>}
            <button type="button" className="btn btn-secondary" style={{ height: 52 }} onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ height: 52 }} disabled={busy}>{busy ? <span className="spinner" /> : 'Save item'}</button>
          </div>
        </form>
      </div>
      {confirmDelete && <DeleteDialog name={source.name} busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={remove} />}
    </AppLayout>
  );
}

function DeleteDialog({ name, busy, onCancel, onConfirm }) {
  return (
    <Dialog labelledBy="del-h" describedBy="del-d" onClose={busy ? undefined : onCancel} width={460}>
      <h2 id="del-h">Delete {name}?</h2>
      <p id="del-d" className="lead" style={{ margin: 0, fontSize: 16 }}>For things added by mistake. You can still put it back from Recently removed for 30 days. If you ate it or threw it out, use “Take some out” instead.</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary btn-sm" style={{ height: 52 }} onClick={onCancel} disabled={busy}>Keep it</button>
        <button type="button" className="btn btn-danger btn-sm" style={{ height: 52 }} onClick={onConfirm} disabled={busy}>{busy ? <span className="spinner" /> : 'Delete'}</button>
      </div>
    </Dialog>
  );
}

// ---------- F19/F20/F24 Item detail ----------

export function ItemDetail() { return <WithKitchen><ItemDetailBody /></WithKitchen>; }

const HOW = [['used', 'Used', 'You ate or cooked with it.'], ['wasted', 'Wasted', 'It went off or got thrown out. Goes into the waste log.'], ['removed', 'Removed', 'It left the kitchen some other way, like given away.']];

function ItemDetailBody() {
  const { user, profile } = useAuth();
  const { active } = useKitchens();
  const { key } = useParams();
  const navigate = useNavigate();
  const items = useItems(active.id);
  const members = useMembers(active.id);
  const [how, setHow] = useState('used');
  const [pick, setPick] = useState(null);
  const [customVal, setCustomVal] = useState(1); // "Custom amount", in the item's own unit
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null); // { text, entries } after a take-out or delete, for Undo
  const [undoing, setUndoing] = useState(false);
  const undo = async () => {
    setUndoing(true); setError(null);
    try { await undoRemoval(active, user, profile, done.entries); setDone(null); }
    catch (err) { setError(friendlyError(err)); }
    setUndoing(false);
  };
  const undoBox = done && (
    <div role="status" className="undo-bar">
      <span><CheckGlyph size={16} /> {done.text}</span>
      <button type="button" className="link-btn" onClick={undo} disabled={undoing}>{undoing ? 'Putting it back…' : 'Undo'}</button>
    </div>
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const batches = useMemo(() => (items || []).filter((i) => groupKey(i) === key).sort(byExpiry), [items, key]);
  const choices = useMemo(() => takeChoices(batches), [batches]);
  // Default to a small amount (not "all"), and only once the batches have loaded.
  useEffect(() => {
    if (!batches.length) return;
    if (pick !== 'custom' && !choices.some((c) => c.id === pick)) setPick(choices[Math.min(1, choices.length - 1)].id);
  }, [choices]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items) return <Loading />;
  if (!batches.length) {
    return (
      <AppLayout>
        <Link to="/kitchen" className="back"><BackGlyph /> Home</Link>
        <h1 className="title" style={{ marginTop: 8 }}>{done ? 'All gone' : "That item isn't in the kitchen"}</h1>
        <p className="lead">{done ? '' : 'Someone may have used it up or removed it. '}You can put it back from <Link to="/kitchen/removed">Recently removed</Link> for {REMOVED_DAYS} days.</p>
        {undoBox && <div style={{ marginTop: 16, maxWidth: 520 }}>{undoBox}</div>}
        <Link to="/kitchen" className="btn btn-primary btn-sm" style={{ marginTop: 20, alignSelf: 'flex-start' }}>Back to the kitchen</Link>
      </AppLayout>
    );
  }

  const first = batches[0];
  const amountBatches = batches.filter((b) => b.mode !== 'level');
  const total = amountBatches.reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const e = expiryInfo(first.expiry);
  const earliest = e.d === null ? 'No expiry date' : e.d < 0 ? 'Expired' : e.d === 0 ? (batches.length > 1 ? 'Earliest expires today' : 'Expires today') : `${batches.length > 1 ? 'Earliest expires' : 'Expires'} in ${e.label.toLowerCase()}`;
  const { bg, Icon } = spotStyle(first.location);
  const choice = choices.find((c) => c.id === pick) || choices[choices.length - 1];
  const verb = { used: 'used', wasted: 'wasted', removed: 'removed' }[how];
  // Custom amount: typed in the unit the item is shown in (pieces, g/kg, ml/L), capped at what's there.
  const customUnit = amountBatches.length ? entryUnit(total, amountBatches[0].unit) : null;
  const customMax = customUnit ? fromBase(total, customUnit) : 0;
  const isCustom = pick === 'custom' && !!customUnit;
  const customBase = isCustom ? toBase(Math.min(Number(customVal) || 0, customMax), customUnit).amount : null;
  const takeAmount = isCustom ? customBase : choice.amount;
  const takeAll = isCustom ? customBase >= total : (choice.amount == null || choice.id === 'all');
  const ctaAmount = isCustom
    ? (takeAll ? `all ${formatAmount({ ...amountBatches[0], amount: total })}` : formatAmount({ ...amountBatches[0], amount: customBase }))
    : choice.amount == null ? 'it' : choice.id === 'all' ? `all ${formatAmount({ ...amountBatches[0], amount: total })}` : formatAmount({ ...amountBatches[0], amount: choice.amount });
  const single = batches.length === 1;

  const take = async () => {
    setBusy(true); setError(null);
    try {
      const entries = await takeOut(active, user, profile, batches, how, takeAll ? null : takeAmount);
      setDone({ text: `Marked ${ctaAmount} as ${verb}.`, entries });
      setBusy(false);
    } catch (err) { setError(friendlyError(err)); setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const entries = await deleteItem(active, user, profile, first); setDone({ text: `Deleted ${first.name}.`, entries }); setConfirmDelete(false); setBusy(false); }
    catch (err) { setError(friendlyError(err)); setBusy(false); setConfirmDelete(false); }
  };

  return (
    <AppLayout>
      <Link to="/kitchen" className="back"><BackGlyph /> Home</Link>
      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <span aria-hidden="true" className="ktile" style={{ width: 72, height: 72, borderRadius: 22, background: bg }}><Icon size={34} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <h1 className="title" style={{ lineHeight: 1 }}>{first.name}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span className="badge" style={{ background: '#E3F3FB', fontSize: 13 }}>{first.location}</span>
              <span className="badge" style={{ background: '#F3ECE4', fontSize: 13 }}>{first.category}</span>
              {first.brand && <span className="badge" style={{ background: '#EDE6FB', fontSize: 13 }}>{first.brand}</span>}
              {first.calories != null && <span className="badge" style={{ background: '#FFF3C4', color: '#5C4300', fontSize: 13 }}>{first.calories} kcal / serving</span>}
              {active.type === 'shared' && <OwnerBadge item={first} members={members} size={28} />}
            </div>
          </div>
        </div>
        {single && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to={`/kitchen/item/${first.id}/edit`} className="pill" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 14 }}><EditGlyph /> Edit</Link>
            <button type="button" className="ghost-btn danger-text" style={{ height: 44, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setConfirmDelete(true)}><TrashGlyph /> Delete (added by mistake)</button>
          </div>
        )}
      </div>
      {first.note && <p className="note" style={{ marginTop: 16 }}><InfoGlyph />{first.note}</p>}
      <Link to="/kitchen/removed" style={{ alignSelf: 'flex-start', marginTop: 12, fontSize: 14 }}>Recently removed</Link>

      <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <section aria-labelledby="b-h" className="card" style={{ flex: '1 1 420px', minWidth: 0, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)' }}>In total</span>
              <span style={{ fontFamily: 'var(--display)', fontSize: 40, lineHeight: 1, fontWeight: 800 }}>
                {amountBatches.length ? formatAmount({ ...amountBatches[0], amount: total }) : LEVEL_LABEL[first.level]}
              </span>
            </div>
            <span className="badge" style={{ height: 32, fontSize: 14, background: e.bg, color: e.fg }}>{earliest}</span>
          </div>
          <h2 id="b-h" className="feed-day" style={{ margin: '8px 0 0' }}>{plural(batches.length, 'batch', 'batches')}</h2>
          {batches.map((b, i) => <BatchRow key={b.id} b={b} n={i + 1} single={single} kitchen={active} user={user} profile={profile} onError={setError} onDeleted={(entries) => setDone({ text: `Deleted a batch of ${b.name}.`, entries })} />)}
          <Link to={`/kitchen/item/new?group=${encodeURIComponent(key)}`} className="dashed-row" style={{ justifyContent: 'center', minHeight: 52 }}><PlusGlyph size={18} /> Add another batch</Link>
        </section>

        <section aria-labelledby="use-h" className="card" style={{ flex: '1 1 320px', minWidth: 0, maxWidth: 420, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 id="use-h" className="h2">Take some out</h2>
          <div role="radiogroup" aria-label="What happened to it?" className="seg">
            {HOW.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={how === id} onClick={() => setHow(id)}>{label}</button>)}
          </div>
          <span className="small">{HOW.find((h) => h[0] === how)[2]}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="label">How much?</span>
            <div role="radiogroup" aria-label="How much?" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {choices.map((c) => <button key={c.id} type="button" role="radio" aria-checked={pick === c.id} className="filter-btn" aria-pressed={pick === c.id} onClick={() => setPick(c.id)}>{c.label}</button>)}
              {customUnit && (
                <button type="button" role="radio" aria-checked={isCustom} className="filter-btn" aria-pressed={isCustom}
                  onClick={() => { setPick('custom'); setCustomVal((v) => Math.min(Math.max(Number(v) || 0, STEP[customUnit] > 1 ? STEP[customUnit] : 1), customMax)); }}>Custom amount</button>
              )}
            </div>
            {isCustom && (
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                <Stepper label="How much to take out" value={Math.min(Number(customVal) || 0, customMax)} step={customUnit === 'pieces' ? 1 : STEP[customUnit]}
                  unit={customUnit === 'pieces' ? (amountBatches[0].noun || 'pcs') : customUnit === 'l' ? 'L' : customUnit} inputWidth={64} live
                  onChange={(v) => setCustomVal(Math.min(v, customMax))} />
                <span className="small">of {formatAmount({ ...amountBatches[0], amount: total })}</span>
              </div>
            )}
            {batches.length > 1 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>Taken from the batch that expires first.</span>}
          </div>
          {error && <ErrorAlert>{error}</ErrorAlert>}
          {undoBox}
          <button type="button" className="btn btn-primary" style={{ height: 54, fontSize: 16 }} disabled={busy || (isCustom && !(customBase > 0))} onClick={take}>
            {busy ? <span className="spinner" /> : `Mark ${ctaAmount} as ${verb}`}
          </button>
        </section>
      </div>
      {confirmDelete && <DeleteDialog name={first.name} busy={busy} onCancel={() => setConfirmDelete(false)} onConfirm={remove} />}
    </AppLayout>
  );
}

function BatchRow({ b, n, single, kitchen, user, profile, onError, onDeleted }) {
  const e = expiryInfo(b.expiry);
  const urgent = e.d !== null && e.d <= 0;
  const added = toDate(b.addedAt);
  const by = b.addedBy === user.uid ? 'you' : (b.addedByName || 'someone').split(' ')[0];
  const eu = b.mode === 'level' ? null : entryUnit(Number(b.amount) || 0, b.unit);
  const save = async (fn) => { try { await fn(); } catch (err) { onError(friendlyError(err)); } };
  return (
    <div className="batch-row" style={{ background: urgent ? 'var(--error-tint)' : 'var(--cream)' }}>
      <span style={{ flex: '1 1 160px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 800 }}>Bought {shortDate(added)}</span>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Added by {by} · {urgent ? <strong style={{ color: '#8E2C26' }}>{dateLine(b)}</strong> : dateLine(b)}
        </span>
      </span>
      {b.mode === 'level' ? (
        <div role="radiogroup" aria-label={`Batch ${n} level`} style={{ display: 'flex', gap: 4 }}>
          {LEVELS.map((l) => (
            <button key={l} type="button" role="radio" aria-checked={b.level === l} className="mini-level" onClick={() => save(() => setLevel(kitchen, user, profile, b, l))}>
              <LevelBars level={l} w={8} />{LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
      ) : (
        <Stepper label={`Batch ${n} amount`} value={fromBase(Number(b.amount) || 0, eu)} step={STEP[eu]} unit={eu === 'pieces' ? (b.noun || 'pcs') : eu === 'l' ? 'L' : eu}
          onChange={(v) => { if (v > 0) save(() => setAmount(kitchen, user, profile, b, toBase(v, eu).amount)); }} />
      )}
      <BatchMenu b={b} n={n} kitchen={kitchen} user={user} profile={profile} onError={onError} onDeleted={onDeleted} />
    </div>
  );
}

// S7 wireframe: "…" on each batch, with Edit and Delete for that batch only.
function BatchMenu({ b, n, kitchen, user, profile, onError, onDeleted }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const remove = async () => {
    setBusy(true);
    try { const entries = await deleteItem(kitchen, user, profile, b); setConfirm(false); onDeleted(entries); }
    catch (err) { onError(friendlyError(err)); setBusy(false); setConfirm(false); }
  };
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" className="ghost-btn" style={{ width: 44, height: 44, padding: 0, fontSize: 20, lineHeight: 1 }}
        aria-label={`More for batch ${n}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>⋯</button>
      {open && (
        <div role="menu" className="batch-menu">
          <Link role="menuitem" to={`/kitchen/item/${b.id}/edit`}><EditGlyph /> Edit this batch</Link>
          <button type="button" role="menuitem" className="danger-text" onClick={() => { setOpen(false); setConfirm(true); }}><TrashGlyph /> Delete (added by mistake)</button>
        </div>
      )}
      {confirm && <DeleteDialog name={`this batch of ${b.name}`} busy={busy} onCancel={() => setConfirm(false)} onConfirm={remove} />}
    </div>
  );
}

// ---------- F25 Recently removed ----------

export function RecentlyRemoved() { return <WithKitchen><RemovedBody /></WithKitchen>; }

const TAGS = { used: ['Used', '#D6F0DC', '#1F5E37'], wasted: ['Wasted', '#FFE3E1', '#8E2C26'], removed: ['Removed', '#F3ECE4', '#5E5552'] };

function ago(d) {
  if (!d) return 'just now';
  const days = Math.floor((Date.now() - d.getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function RemovedBody() {
  const { user, profile } = useAuth();
  const { active, kitchens } = useKitchens();
  const [entries, setEntries] = useState(null);
  const [back, setBack] = useState({}); // restored here: id -> entry
  const [error, setError] = useState(null);
  useEffect(() => watchRemoved(active.id, setEntries, () => setEntries([])), [active.id]);

  const rows = useMemo(() => {
    const list = [...(entries || [])];
    for (const r of Object.values(back)) if (!list.some((x) => x.id === r.id)) list.push(r);
    return list.sort((a, b) => ((toDate(b.at) || new Date()) - (toDate(a.at) || new Date())));
  }, [entries, back]);

  const doRestore = async (r) => {
    setError(null);
    setBack((x) => ({ ...x, [r.id]: { ...r, restoring: true } }));
    try { await restore(active, user, profile, r); setBack((x) => ({ ...x, [r.id]: { ...r, restored: true } })); }
    catch (e) { setError(friendlyError(e)); setBack((x) => { const n = { ...x }; delete n[r.id]; return n; }); }
  };

  return (
    <AppLayout>
      <div style={{ width: '100%', maxWidth: 860, display: 'flex', flexDirection: 'column' }}>
        <Link to="/kitchen" className="back"><BackGlyph /> Home</Link>
        <h1 className="title" style={{ marginTop: 8 }}>Recently removed</h1>
        <p className="lead">Took something out by mistake? Put it back. Items stay here for {REMOVED_DAYS} days.</p>
        {kitchens.length > 1 && <p className="small" style={{ margin: '6px 0 0', fontSize: 15 }}>Showing <strong>{active.name}</strong>. Switch kitchens to see the others.</p>}
        {error && <div style={{ marginTop: 16 }}><ErrorAlert>{error}</ErrorAlert></div>}
        {!entries && <div role="status" aria-label="Loading" style={{ padding: 48, display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}
        {entries && (
          <ul className="card" style={{ margin: '28px 0 0', padding: 12, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {rows.length === 0 && <li style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>Nothing removed in the last {REMOVED_DAYS} days.</li>}
            {rows.map((r) => {
              const at = toDate(r.at);
              const left = Math.max(0, REMOVED_DAYS - Math.floor((Date.now() - (at ? at.getTime() : Date.now())) / 864e5));
              const [tag, tbg, tfg] = r.mistake ? ['Deleted', '#F3ECE4', '#5E5552'] : (TAGS[r.how] || TAGS.removed);
              const st = back[r.id];
              return (
                <li key={r.id} className="removed-row" style={{ background: st && st.restored ? '#EAF7EE' : 'transparent' }}>
                  <span style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>{r.name}{r.mode !== 'level' && r.amount ? `, ${formatAmount(r)}` : ''}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{r.byId === user.uid ? 'You' : (r.byName || '').split(' ')[0]} · {ago(at)} · {r.location}</span>
                  </span>
                  <span className="badge" style={{ background: tbg, color: tfg }}>{tag}</span>
                  <span className="days-left">{plural(left, 'day')} left</span>
                  {st && st.restored ? (
                    <span role="status" className="restore-done"><CheckGlyph size={16} /> Back in {r.location}</span>
                  ) : (
                    <button type="button" className="restore-btn" aria-label={`Restore ${r.name}`} disabled={st && st.restoring} onClick={() => doRestore(r)}><RestoreGlyph /> Restore</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}

export { itemLink };
