// Epic 3: inventory (F14–F29).
//
// kitchens/{kitchenId}/items/{id} is one batch (F19): one purchase of an
// item, with its own amount and expiry. Batches with the same nameKey are
// shown together with a combined total.
//   name, nameKey, catalogId, category, location,
//   mode ('amount' | 'level'), amount (base units) | null, unit ('g' | 'ml' | 'pieces'),
//   noun (e.g. 'loaf') | null, level ('low' | 'half' | 'full') | null,
//   expiry ('YYYY-MM-DD') | null, dateType ('best-before' | 'use-by'),
//   ownerId, shared, note, addedBy, addedByName, addedAt, updatedAt, updatedBy
//
// kitchens/{kitchenId}/removed/{id}: what was taken out (F24/F25), kept 30
// days so it can be put back. how: 'used' | 'wasted' | 'removed'. Wasted
// entries are the waste log for Epic 9.
//
// users/{uid}/myItems/{key}: what this person adds and how often, for
// "You often add" (F15) and their own custom items (F16).
//
// Writes use batched writes (not transactions), so they also work offline
// and sync later. Taking some out uses increments (SRS 8.4 item 11).
import {
  collection, doc, getDoc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { CATALOG, nameKey } from './catalog';
import { formatAmount } from './units';

export const REMOVED_DAYS = 30;
const itemsCol = (kid) => collection(db, 'kitchens', kid, 'items');
const removedCol = (kid) => collection(db, 'kitchens', kid, 'removed');
const activityCol = (kid) => collection(db, 'kitchens', kid, 'activity');
const myItemRef = (uid, key) => doc(db, 'users', uid, 'myItems', key.replace(/\s+/g, '-').slice(0, 100) || 'item');

// ---------- dates ----------

export function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Whole days from today to the expiry date (0 = today, negative = past). null = no date.
export function daysLeft(expiry) {
  if (!expiry) return null;
  const [y, m, d] = expiry.split('-').map(Number);
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - t) / 864e5);
}
// FR3.16: soonest first, undated last.
export const byExpiry = (a, b) => (a.expiry || '9999') .localeCompare(b.expiry || '9999');

// ---------- defaults (F18, F31) ----------

// Picks the kitchen's spot for a default ("Freezer" -> "Fridge" if there's no freezer).
export function pickSpot(wanted, spots) {
  const list = spots && spots.length ? spots : ['Fridge', 'Pantry', 'Cupboard'];
  const hit = list.find((s) => s.toLowerCase() === String(wanted || '').toLowerCase());
  if (hit) return hit;
  if (/freez/i.test(wanted || '')) return list.find((s) => /fridge/i.test(s)) || list[0];
  return list[0];
}

// A new batch from a catalogue entry or one of "my items".
export function defaultsFor(entry, kitchen, user) {
  const level = entry.mode === 'level';
  return {
    name: entry.name,
    nameKey: nameKey(entry.name),
    catalogId: entry.catalogId || (CATALOG.some((c) => c.id === entry.id) ? entry.id : null),
    category: entry.category || 'Other',
    location: pickSpot(entry.location, kitchen.locations),
    mode: level ? 'level' : 'amount',
    amount: level ? null : Number(entry.amount) || 1,
    unit: entry.unit || 'pieces',
    noun: entry.noun || null,
    level: level ? 'full' : null,
    expiry: entry.shelfDays ? todayISO(entry.shelfDays) : null,
    dateType: entry.dateType || 'best-before',
    ownerId: user.uid,
    shared: false,
    note: ''
  };
}

// ---------- writes ----------

const who = (user, profile) => ((profile && profile.name) || user.displayName || 'Someone');

function logActivity(batch, kid, user, profile, type, item, quantity) {
  const ref = doc(activityCol(kid));
  batch.set(ref, {
    type, actorId: user.uid, actorName: who(user, profile),
    itemId: item.id || null, itemName: item.name, location: item.location || null,
    quantity: quantity || null, at: serverTimestamp()
  });
  return ref.id;
}

function rememberForMe(batch, user, item, custom) {
  batch.set(myItemRef(user.uid, item.nameKey), {
    name: item.name, category: item.category, location: item.location, mode: item.mode,
    amount: item.amount, unit: item.unit, noun: item.noun, dateType: item.dateType,
    shelfDays: item.expiry ? Math.max(1, daysLeft(item.expiry)) : null,
    catalogId: item.catalogId || null, custom: !!custom,
    count: increment(1), lastAddedAt: serverTimestamp()
  }, { merge: true });
}

const clean = (f) => ({
  name: String(f.name).replace(/\s+/g, ' ').trim().slice(0, 60),
  nameKey: nameKey(f.name),
  catalogId: f.catalogId || null,
  category: f.category || 'Other',
  location: f.location,
  mode: f.mode === 'level' ? 'level' : 'amount',
  amount: f.mode === 'level' ? null : Math.max(0, Number(f.amount) || 0),
  unit: f.unit || 'pieces',
  noun: f.noun || null,
  level: f.mode === 'level' ? (f.level || 'full') : null,
  expiry: f.expiry || null,
  dateType: f.dateType === 'use-by' ? 'use-by' : 'best-before',
  ownerId: f.ownerId,
  shared: !!f.shared,
  note: String(f.note || '').slice(0, 200)
});

// F14/F16/F18. Resolves to { id, activityId } (both needed for Undo).
export async function addItem(kitchen, user, profile, fields, { custom = false } = {}) {
  const ref = doc(itemsCol(kitchen.id));
  const item = { ...clean(fields), addedBy: user.uid, addedByName: who(user, profile), addedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: user.uid };
  const batch = writeBatch(db);
  batch.set(ref, item);
  const activityId = logActivity(batch, kitchen.id, user, profile, 'item-added', { ...item, id: ref.id }, formatAmount(item));
  rememberForMe(batch, user, item, custom);
  await batch.commit();
  return { id: ref.id, activityId };
}

// "Undo" right after Add (AddItem mockup): as if it never happened.
export async function undoAdd(kitchen, user, added, item) {
  const batch = writeBatch(db);
  batch.delete(doc(itemsCol(kitchen.id), added.id));
  batch.delete(doc(activityCol(kitchen.id), added.activityId));
  batch.set(myItemRef(user.uid, nameKey(item.name)), { count: increment(-1) }, { merge: true });
  await batch.commit();
}

// F29: several at once, one batched write.
export async function addMany(kitchen, user, profile, list) {
  const batch = writeBatch(db);
  for (const fields of list) {
    const ref = doc(itemsCol(kitchen.id));
    const item = { ...clean(fields), addedBy: user.uid, addedByName: who(user, profile), addedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: user.uid };
    batch.set(ref, item);
    logActivity(batch, kitchen.id, user, profile, 'item-added', { ...item, id: ref.id }, formatAmount(item));
    rememberForMe(batch, user, item, false);
  }
  await batch.commit();
}

// F23: edit any attribute.
export async function updateItem(kitchen, user, profile, id, fields) {
  const c = clean(fields);
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(kitchen.id), id), { ...c, updatedAt: serverTimestamp(), updatedBy: user.uid });
  logActivity(batch, kitchen.id, user, profile, 'item-edited', { ...c, id }, formatAmount(c));
  await batch.commit();
}

// F20: stepper / typed amount for one batch.
export async function setAmount(kitchen, user, profile, item, amount) {
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(kitchen.id), item.id), { amount: Math.max(0, amount), updatedAt: serverTimestamp(), updatedBy: user.uid });
  logActivity(batch, kitchen.id, user, profile, 'item-edited', item, formatAmount({ ...item, amount }));
  await batch.commit();
}

export async function setLevel(kitchen, user, profile, item, level) {
  const batch = writeBatch(db);
  batch.update(doc(itemsCol(kitchen.id), item.id), { level, updatedAt: serverTimestamp(), updatedBy: user.uid });
  logActivity(batch, kitchen.id, user, profile, 'item-edited', item, formatAmount({ ...item, level }));
  await batch.commit();
}

// F23: "Delete (added by mistake)". It still goes to Recently removed, so
// anything that leaves the kitchen can be put back for 30 days (F25).
export async function deleteItem(kitchen, user, profile, item) {
  const batch = writeBatch(db);
  batch.delete(doc(itemsCol(kitchen.id), item.id));
  const ref = doc(removedCol(kitchen.id));
  batch.set(ref, removalEntry(item, 'removed', item.mode === 'level' ? null : Number(item.amount) || 0, user, profile, true));
  logActivity(batch, kitchen.id, user, profile, 'item-removed', item, 'added by mistake');
  await batch.commit();
  return [{ id: ref.id, ...removalEntry(item, 'removed', item.mode === 'level' ? null : Number(item.amount) || 0, user, profile, true) }];
}

const SNAPSHOT = ['name', 'nameKey', 'catalogId', 'category', 'location', 'mode', 'unit', 'noun', 'level', 'expiry', 'dateType', 'ownerId', 'shared', 'note', 'addedBy', 'addedByName'];
const snapshot = (b) => Object.fromEntries(SNAPSHOT.map((k) => [k, b[k] === undefined ? null : b[k]]));

// One Recently removed record (kitchens/{id}/removed): enough to put it back.
function removalEntry(b, how, take, user, profile, mistake = false) {
  return {
    itemId: b.id, name: b.name, nameKey: b.nameKey, location: b.location, how,
    mode: b.mode, amount: take, unit: b.unit, noun: b.noun || null, level: b.level || null,
    byId: user.uid, byName: who(user, profile), at: serverTimestamp(), item: snapshot(b),
    ...(mistake ? { mistake: true } : {})
  };
}

// F24: take some (amount) or all (amount = null) of an item out, from the
// batch that expires first. how: 'used' | 'wasted' | 'removed'.
export async function takeOut(kitchen, user, profile, batches, how, amount = null) {
  const sorted = [...batches].sort(byExpiry);
  const batch = writeBatch(db);
  let left = amount == null ? Infinity : amount;
  let taken = 0;
  const entries = []; // returned so the screen can offer Undo
  for (const b of sorted) {
    if (left <= 0) break;
    const has = b.mode === 'level' ? null : Number(b.amount) || 0;
    const take = has == null ? null : Math.min(has, left);
    const all = has == null || take >= has;
    if (all) batch.delete(doc(itemsCol(kitchen.id), b.id));
    else batch.update(doc(itemsCol(kitchen.id), b.id), { amount: increment(-take), updatedAt: serverTimestamp(), updatedBy: user.uid });
    const ref = doc(removedCol(kitchen.id));
    const entry = removalEntry(b, how, take, user, profile);
    batch.set(ref, entry);
    entries.push({ id: ref.id, ...entry });
    if (take != null) { left -= take; taken += take; }
  }
  const first = sorted[0];
  const type = { used: 'item-consumed', wasted: 'item-wasted', removed: 'item-removed' }[how];
  const qty = first.mode === 'level' ? null : formatAmount({ ...first, amount: taken });
  logActivity(batch, kitchen.id, user, profile, type, first, qty);
  await batch.commit();
  return entries;
}

// "Undo" straight after taking out or deleting: put every part back.
export async function undoRemoval(kitchen, user, profile, entries) {
  for (const e of entries) await restore(kitchen, user, profile, e);
}

// F25: put a recently removed entry back.
export async function restore(kitchen, user, profile, entry) {
  const ref = doc(itemsCol(kitchen.id), entry.itemId);
  const existing = await getDoc(ref).catch(() => null);
  const batch = writeBatch(db);
  if (existing && existing.exists() && entry.mode !== 'level') {
    batch.update(ref, { amount: increment(entry.amount || 0), updatedAt: serverTimestamp(), updatedBy: user.uid });
  } else {
    const item = { ...entry.item };
    // The owner may have left the kitchen since; then it comes back as yours.
    if (!(kitchen.memberIds || []).includes(item.ownerId)) { item.ownerId = user.uid; item.shared = false; }
    batch.set(ref, { ...item, amount: entry.mode === 'level' ? null : entry.amount, addedAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: user.uid });
  }
  batch.delete(doc(removedCol(kitchen.id), entry.id));
  logActivity(batch, kitchen.id, user, profile, 'item-restored', { ...entry.item, id: entry.itemId }, entry.mode === 'level' ? null : formatAmount(entry));
  await batch.commit();
}

// ---------- reads ----------

const withId = (d) => ({ id: d.id, ...d.data() });

export function watchRemoved(kitchenId, onChange, onError) {
  const q = query(removedCol(kitchenId), orderBy('at', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    const cutoff = Date.now() - REMOVED_DAYS * 864e5;
    onChange(snap.docs.map(withId).filter((e) => !e.at || e.at.toMillis() > cutoff));
  }, onError);
}

// F15: most added first, then most recent.
export function watchMyItems(uid, onChange, onError) {
  return onSnapshot(query(collection(db, 'users', uid, 'myItems'), limit(300)), (snap) => {
    const list = snap.docs.map(withId).sort((a, b) => (b.count || 0) - (a.count || 0)
      || ((b.lastAddedAt && b.lastAddedAt.toMillis()) || 0) - ((a.lastAddedAt && a.lastAddedAt.toMillis()) || 0));
    onChange(list);
  }, onError);
}

// Whose a batch is, for grouping and badges (F27).
export const ownerKey = (it) => (it.shared ? 'shared' : it.ownerId);
export const groupKey = (it) => `${it.nameKey}|${it.location}|${ownerKey(it)}`;

// Batches grouped by item, spot and owner (F19): combined total, earliest expiry.
export function groupItems(items) {
  const map = new Map();
  for (const it of items) {
    const key = groupKey(it);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  return [...map.values()].map((batches) => {
    batches.sort(byExpiry);
    const first = batches[0];
    const amountOnes = batches.filter((b) => b.mode !== 'level');
    const total = amountOnes.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    return {
      key: groupKey(first), ownerId: first.ownerId, shared: first.shared,
      nameKey: first.nameKey, name: first.name, location: first.location, category: first.category,
      batches, expiry: first.expiry, first,
      mode: amountOnes.length ? 'amount' : 'level',
      level: amountOnes.length ? null : first.level,
      total, unit: (amountOnes[0] || first).unit, noun: (amountOnes[0] || first).noun
    };
  });
}
