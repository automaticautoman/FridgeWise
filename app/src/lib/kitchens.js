// Epic 2 (F06–F13) for the screens: actions go to the server
// (/api/kitchens), reads are live Firestore listeners, so changes made by
// other members show up on their own (F12).
//
// Errors carry a `code` (e.g. 'kitchen/bad-code'), like Firebase errors,
// so friendlyError() in auth/errors.js turns them into copy.
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { saveProfile } from './profile';

async function kitchenApi(action, body = {}) {
  const user = auth.currentUser;
  if (!user) { const e = new Error('not signed in'); e.code = 'auth/not-signed-in'; throw e; }
  let res;
  try {
    res = await fetch('/api/kitchens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
      body: JSON.stringify({ action, ...body })
    });
  } catch {
    const e = new Error('offline'); e.code = 'auth/network-request-failed'; throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || 'server-error');
    e.code = data.error || 'server-error';
    e.retryAfter = data.retryAfter;
    throw e;
  }
  return data;
}

// ---------- actions ----------

export const DEFAULT_LOCATIONS = ['Fridge', 'Pantry', 'Cupboard'];

// F06. type: 'shared' (housemates) or 'private' (my home). Resolves to { kitchenId }.
// The new kitchen also becomes the active one.
export const createKitchen = ({ name, type, locations = DEFAULT_LOCATIONS }) =>
  kitchenApi('create', { name, type, locations });

// Owner only. Any of: name, locations, invitePolicy ('anyone' | 'owner').
export const updateKitchen = (kitchenId, changes) => kitchenApi('update', { kitchenId, ...changes });

// F08. Current code, or a new one if none is valid. renew: true makes a new
// code and turns the old one off. Resolves to { code, expiresAt (ms) }.
export const getInvite = (kitchenId, { renew = false } = {}) => kitchenApi('invite', { kitchenId, renew });
// The current code if there is one, without making a new one: { code: null } otherwise.
export const peekInvite = (kitchenId) => kitchenApi('invite', { kitchenId, peek: true });
export const revokeInvite = (kitchenId) => kitchenApi('revokeInvite', { kitchenId });
// S9: emails the link and code (up to 10 emails an hour per kitchen).
export const inviteByEmail = (kitchenId, email) => kitchenApi('inviteEmail', { kitchenId, email });

export const inviteLink = (code) => `${window.location.origin}/join/${code}`;
export const normalizeCode = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

// F09. preview shows "Found it! Is this the right kitchen?" before joining:
// { kitchenId, name, type, memberCount, ownerName, memberNames, alreadyMember }.
// Bad codes reject with 'kitchen/bad-code'; after 5 in a row,
// 'kitchen/too-many-tries' with retryAfter (seconds).
export const previewInvite = (code) => kitchenApi('preview', { code: normalizeCode(code) });
export const joinKitchen = (code) => kitchenApi('join', { code: normalizeCode(code) });

// F11. An owner with other members gets 'kitchen/transfer-first'.
// The last member leaving deletes the kitchen ({ deleted: true }).
export const leaveKitchen = (kitchenId) => kitchenApi('leave', { kitchenId });
export const removeMember = (kitchenId, memberId) => kitchenApi('removeMember', { kitchenId, memberId });
export const transferOwnership = (kitchenId, newOwnerId, { andLeave = false } = {}) =>
  kitchenApi('transfer', { kitchenId, newOwnerId, andLeave });

// F07: the kitchen picked in the switcher, saved on the profile.
export const setActiveKitchen = (uid, kitchenId) => saveProfile(uid, { activeKitchenId: kitchenId });

// ---------- live reads (F07, F10, F12, F13) ----------
// Each returns an unsubscribe function. onError gets Firestore errors.

const withId = (d) => ({ id: d.id, ...d.data() });

// Only kitchens the user belongs to; the rules reject any other query.
export function watchMyKitchens(uid, onChange, onError) {
  const q = query(collection(db, 'kitchens'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(withId).sort((a, b) => a.name.localeCompare(b.name))), onError);
}

export function watchKitchen(kitchenId, onChange, onError) {
  return onSnapshot(doc(db, 'kitchens', kitchenId), (snap) => onChange(snap.exists() ? withId(snap) : null), onError);
}

// Owner first, then by join date (Members mockup).
export function watchMembers(kitchenId, onChange, onError) {
  const q = query(collection(db, 'kitchens', kitchenId, 'members'), orderBy('joinedAt'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(withId);
    onChange([...list.filter((m) => m.role === 'owner'), ...list.filter((m) => m.role !== 'owner')]);
  }, onError);
}

// The kitchen's items (filled in by Epic 3). F12: updates live for everyone.
export function watchItems(kitchenId, onChange, onError) {
  return onSnapshot(collection(db, 'kitchens', kitchenId, 'items'), (snap) => onChange(snap.docs.map(withId)), onError);
}

// Newest first. Entry types: kitchen-created, member-joined, member-left,
// member-removed, owner-changed, and item-* from Epic 3.
export function watchActivity(kitchenId, onChange, onError, max = 50) {
  const q = query(collection(db, 'kitchens', kitchenId, 'activity'), orderBy('at', 'desc'), limit(max));
  return onSnapshot(q, (snap) => onChange(snap.docs.map(withId)), onError);
}
