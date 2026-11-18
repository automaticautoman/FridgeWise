// End-to-end check of Epic 2 (F06–F13): server actions + security rules.
//
// Needs the app running (npm run dev, or set KITCHENS_API) and the latest
// firestore.rules published to the same project. Uses the real project from
// .env.local by default; pass --mode emulator to use the emulators instead.
// Creates three throwaway users (owner, housemate, outsider) and deletes
// everything it made at the end, even if a check fails.
//
//   npm run test:kitchens
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { loadEnv } from 'vite';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
  collection, query, where, onSnapshot, serverTimestamp
} from 'firebase/firestore';

const args = process.argv.slice(2);
const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : 'development';
const root = fileURLToPath(new URL('../..', import.meta.url));
const env = loadEnv(mode, root, '');
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v;
const emulator = process.env.VITE_USE_EMULATORS === 'true';
const API = process.env.KITCHENS_API || 'http://localhost:5173/api/kitchens';

const { adminAuth, adminDb } = await import('../../api/_lib/admin.js');

let passed = 0, failed = 0;
const check = (name, cond, extra = '') => {
  if (cond) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' -- ' + extra : '')); }
};
const denied = async (name, p) => {
  try { await p; check(name, false, 'was allowed'); }
  catch (e) { check(name, e.code === 'permission-denied', e.code); }
};
const allowed = async (name, p) => {
  try { const r = await p; check(name, true); return r; }
  catch (e) { check(name, false, e.code || e.message); return null; }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A valid item batch (src/lib/items.js) owned by uid.
const item = (uid, over = {}) => ({
  name: 'Item', nameKey: (over.name || 'item').toLowerCase(), catalogId: null, category: 'Other', location: 'Fridge',
  mode: 'amount', amount: 1000, unit: 'ml', noun: null, level: null, expiry: null, dateType: 'best-before',
  ownerId: uid, shared: false, note: '', addedBy: uid, addedByName: 'Test', ...over
});

// ---------- throwaway users ----------
const tag = crypto.randomBytes(4).toString('hex');
const users = {};
const madeKitchens = new Set();

async function makeUser(key, name) {
  const email = `fw-test-${tag}-${key}@fridgewise.test`;
  const password = crypto.randomBytes(12).toString('base64url') + 'a1';
  const u = await adminAuth().createUser({ email, password, displayName: name });
  await adminDb().collection('users').doc(u.uid).set({ name, email, createdAt: new Date(), updatedAt: new Date() });
  const app = initializeApp(emulator
    ? { apiKey: 'demo-key', projectId: 'demo-fridgewise', appId: 'demo' }
    : { apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: process.env.VITE_FIREBASE_PROJECT_ID, appId: process.env.VITE_FIREBASE_APP_ID },
  'u-' + key);
  const a = getAuth(app);
  const fs = getFirestore(app);
  if (emulator) { connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(fs, '127.0.0.1', 8080); }
  await signInWithEmailAndPassword(a, email, password);
  users[key] = { uid: u.uid, name, app, auth: a, db: fs };
  return users[key];
}

async function api(who, action, body = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await users[who].auth.currentUser.getIdToken() },
    body: JSON.stringify({ action, ...body })
  });
  const data = await res.json().catch(() => ({}));
  if (data.kitchenId) madeKitchens.add(data.kitchenId);
  return { status: res.status, ...data };
}

async function cleanup() {
  for (const id of madeKitchens) await adminDb().recursiveDelete(adminDb().collection('kitchens').doc(id)).catch(() => {});
  const invites = await adminDb().collection('invites').get();
  for (const d of invites.docs) if (madeKitchens.has(d.data().kitchenId)) await d.ref.delete();
  for (const u of Object.values(users)) {
    await adminDb().collection('joinAttempts').doc(u.uid).delete().catch(() => {});
    await adminDb().recursiveDelete(adminDb().collection('users').doc(u.uid)).catch(() => {});
    await adminAuth().deleteUser(u.uid).catch(() => {});
    await deleteApp(u.app).catch(() => {});
  }
}

console.log(`\nEpic 2 kitchens test against ${emulator ? 'the emulators' : 'project ' + process.env.VITE_FIREBASE_PROJECT_ID} via ${API}\n`);
try {
  const sara = await makeUser('owner', 'Sara Test');
  const ali = await makeUser('member', 'Ali Test');
  const zed = await makeUser('outsider', 'Zed Test');

  // F06 create
  console.log('F06 create kitchen');
  check('rejects a missing name', (await api('owner', 'create', { name: ' ', type: 'shared' })).error === 'kitchen/invalid-name');
  check('rejects calls without a sign-in', (await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"action":"create"}' })).status === 401);
  const c = await api('owner', 'create', { name: 'Room 4B kitchen', type: 'shared' });
  check('creates a shared kitchen', c.status === 200 && !!c.kitchenId, JSON.stringify(c));
  const kid = c.kitchenId;
  const k0 = (await getDoc(doc(sara.db, 'kitchens', kid))).data();
  check('owner is the creator', k0.ownerId === sara.uid && k0.memberIds.length === 1);
  check('has fridge, pantry and cupboard', JSON.stringify(k0.locations) === '["Fridge","Pantry","Cupboard"]');
  check('becomes the active kitchen', (await getDoc(doc(sara.db, 'users', sara.uid))).data().activeKitchenId === kid);
  const priv = await api('owner', 'create', { name: 'Home', type: 'private', locations: ['Fridge', 'Freezer'] });
  check('creates a private kitchen with custom spots', priv.status === 200);

  // F07 isolation (rules)
  console.log('F07 data isolation');
  await denied('outsider cannot read the kitchen', getDoc(doc(zed.db, 'kitchens', kid)));
  await denied('outsider cannot list members', getDocs(collection(zed.db, 'kitchens', kid, 'members')));
  await denied('outsider cannot read items', getDocs(collection(zed.db, 'kitchens', kid, 'items')));
  await denied('cannot query all kitchens', getDocs(collection(zed.db, 'kitchens')));
  await denied('owner cannot edit the kitchen directly', updateDoc(doc(sara.db, 'kitchens', kid), { ownerId: zed.uid }));
  await denied('nobody can add themselves as a member', updateDoc(doc(zed.db, 'kitchens', kid), { memberIds: [sara.uid, zed.uid] }));
  await denied('invite codes are not readable', getDoc(doc(sara.db, 'kitchens', kid, 'private', 'invite')));
  const mine = await allowed('"my kitchens" query works', getDocs(query(collection(sara.db, 'kitchens'), where('memberIds', 'array-contains', sara.uid))));
  check('owner sees both own kitchens', mine && mine.size === 2);
  check('outsider gets "not found" from the server', (await api('outsider', 'invite', { kitchenId: kid })).error === 'kitchen/not-found');
  await allowed('can switch the active kitchen', updateDoc(doc(sara.db, 'users', sara.uid), { activeKitchenId: priv.kitchenId }));

  // F08 invite
  console.log('F08 invites');
  const inv = await api('owner', 'invite', { kitchenId: kid });
  check('makes a 6-character code', /^[A-HJ-NP-Z2-9]{6}$/.test(inv.code || ''), JSON.stringify(inv));
  check('code lasts 7 days', Math.abs(inv.expiresAt - Date.now() - 7 * 864e5) < 60e3);
  check('asking again returns the same code', (await api('owner', 'invite', { kitchenId: kid })).code === inv.code);
  check('invite email needs a real address', (await api('owner', 'inviteEmail', { kitchenId: kid, email: 'nope' })).error === 'kitchen/invalid-email');
  check('no invite emails for private kitchens', (await api('owner', 'inviteEmail', { kitchenId: priv.kitchenId, email: 'a@example.com' })).error === 'kitchen/private');
  check('outsiders cannot send invite emails', (await api('outsider', 'inviteEmail', { kitchenId: kid, email: 'a@example.com' })).error === 'kitchen/not-found');
  check('owner renames the kitchen and its spots', (await api('owner', 'update', { kitchenId: kid, name: 'Room 4B', locations: ['Fridge', 'Freezer', 'Pantry', 'Cupboard'] })).ok === true);
  check('private kitchens have no invites', (await api('owner', 'invite', { kitchenId: priv.kitchenId })).error === 'kitchen/private');
  const inv2 = await api('owner', 'invite', { kitchenId: kid, renew: true });
  check('"New code" makes a different code', inv2.code && inv2.code !== inv.code);
  check('old code stops working', (await api('member', 'preview', { code: inv.code })).error === 'kitchen/bad-code');

  // F09 join
  console.log('F09 join');
  const pv = await api('member', 'preview', { code: inv2.code.toLowerCase().replace(/(...)/, '$1 ') });
  check('preview shows the kitchen (code is case/space tolerant)', pv.name === 'Room 4B' && pv.ownerName === 'Sara Test' && pv.memberCount === 1, JSON.stringify(pv));
  const j = await api('member', 'join', { code: inv2.code });
  check('joins with the code', j.status === 200 && j.kitchenId === kid && !j.alreadyMember);
  check('joining twice is harmless', (await api('member', 'join', { code: inv2.code })).alreadyMember === true);
  const k1 = await allowed('new member can read the kitchen', getDoc(doc(ali.db, 'kitchens', kid)));
  check('member count is 2', k1 && k1.data().memberCount === 2);

  // F10 members
  console.log('F10 members');
  const ms = await allowed('member can list members', getDocs(collection(ali.db, 'kitchens', kid, 'members')));
  check('owner is marked owner', ms && ms.docs.find((d) => d.id === sara.uid).data().role === 'owner');
  check('members have their email saved', ms && ms.docs.every((d) => /@fridgewise\.test$/.test(d.data().email || '')));

  // Invite policy
  console.log('Invite policy');
  check('members may invite by default', (await api('member', 'invite', { kitchenId: kid })).code === inv2.code);
  check('only the owner changes the policy', (await api('member', 'update', { kitchenId: kid, invitePolicy: 'owner' })).error === 'kitchen/owner-only');
  check('owner restricts invites', (await api('owner', 'update', { kitchenId: kid, invitePolicy: 'owner' })).ok === true);
  check('member can no longer invite', (await api('member', 'invite', { kitchenId: kid })).error === 'kitchen/invites-owner-only');

  // F12 shared changes
  console.log('F12 shared change propagation');
  const seen = new Promise((resolve) => {
    const stop = onSnapshot(collection(sara.db, 'kitchens', kid, 'items'), (s) => { if (s.docs.some((d) => d.data().name === 'Milk')) { stop(); resolve(true); } });
    setTimeout(() => { stop(); resolve(false); }, 10000);
  });
  await allowed('member adds a shared item', addDoc(collection(ali.db, 'kitchens', kid, 'items'), item(ali.uid, { name: 'Milk', shared: true })));
  check("owner's live listener sees it", await seen);
  await allowed('member adds a personal item', setDoc(doc(ali.db, 'kitchens', kid, 'items', 'ali-eggs'), item(ali.uid, { name: 'Eggs', unit: 'pieces', amount: 12 })));

  // Epic 3 item rules
  console.log('Epic 3 item rules');
  await denied('item owner must be a member', addDoc(collection(ali.db, 'kitchens', kid, 'items'), item(zed.uid, { name: 'Bad' })));
  await denied('item needs a name', addDoc(collection(ali.db, 'kitchens', kid, 'items'), item(ali.uid, { name: '' })));
  await denied('no unknown fields on items', addDoc(collection(ali.db, 'kitchens', kid, 'items'), { ...item(ali.uid, { name: 'X' }), price: 5 }));
  await denied('bad expiry format', addDoc(collection(ali.db, 'kitchens', kid, 'items'), item(ali.uid, { name: 'X', expiry: 'tomorrow' })));
  await allowed('level items need no amount', addDoc(collection(ali.db, 'kitchens', kid, 'items'), item(ali.uid, { name: 'Rice', mode: 'level', level: 'half', amount: null, shared: true })));
  await denied('cannot change who added an item', updateDoc(doc(sara.db, 'kitchens', kid, 'items', 'ali-eggs'), { addedBy: sara.uid }));
  await allowed('any member can edit an item', updateDoc(doc(sara.db, 'kitchens', kid, 'items', 'ali-eggs'), { amount: 10 }));
  await allowed('member logs a removal', addDoc(collection(ali.db, 'kitchens', kid, 'removed'), { name: 'Milk', how: 'used', byId: ali.uid, byName: 'Ali Test', at: serverTimestamp() }));
  await denied('cannot log a removal as someone else', addDoc(collection(ali.db, 'kitchens', kid, 'removed'), { name: 'Milk', how: 'used', byId: sara.uid, at: serverTimestamp() }));
  await denied('outsider cannot read removals', getDocs(collection(zed.db, 'kitchens', kid, 'removed')));
  await allowed('own item history is writable', setDoc(doc(ali.db, 'users', ali.uid, 'myItems', 'milk'), { name: 'Milk', count: 1 }));
  await denied("cannot read someone else's item history", getDocs(collection(sara.db, 'users', ali.uid, 'myItems')));

  // F13 activity
  console.log('F13 activity feed');
  await allowed('member logs an item event', addDoc(collection(ali.db, 'kitchens', kid, 'activity'), { type: 'item-added', actorId: ali.uid, actorName: 'Ali Test', itemName: 'Milk', at: serverTimestamp() }));
  await denied('cannot log as someone else', addDoc(collection(ali.db, 'kitchens', kid, 'activity'), { type: 'item-added', actorId: sara.uid, actorName: 'Sara', at: serverTimestamp() }));
  await denied('cannot fake membership events', addDoc(collection(ali.db, 'kitchens', kid, 'activity'), { type: 'member-removed', actorId: ali.uid, actorName: 'Ali', at: serverTimestamp() }));
  const feed = await allowed('member reads the feed', getDocs(collection(ali.db, 'kitchens', kid, 'activity')));
  const types = feed ? feed.docs.map((d) => d.data().type) : [];
  check('feed has created, joined and item events', ['kitchen-created', 'member-joined', 'item-added'].every((t) => types.includes(t)), types.join(','));

  // F11 leave / remove / transfer
  console.log('F11 leave, remove, transfer');
  check('owner must hand over first', (await api('owner', 'leave', { kitchenId: kid })).error === 'kitchen/transfer-first');
  check('member cannot remove people', (await api('member', 'removeMember', { kitchenId: kid, memberId: sara.uid })).error === 'kitchen/owner-only');
  const lv = await api('member', 'leave', { kitchenId: kid });
  check('member leaves', lv.ok === true);
  await wait(500);
  const items = (await adminDb().collection('kitchens').doc(kid).collection('items').get()).docs.map((d) => d.data().name);
  check('their personal items are removed, shared stay', items.includes('Milk') && !items.includes('Eggs'), items.join(','));
  await denied('ex-member loses access', getDoc(doc(ali.db, 'kitchens', kid)));

  await api('owner', 'update', { kitchenId: kid, invitePolicy: 'anyone' });
  check('rejoins', (await api('member', 'join', { code: inv2.code })).status === 200);
  check('owner removes a member', (await api('owner', 'removeMember', { kitchenId: kid, memberId: ali.uid })).ok === true);
  await denied('removed member loses access', getDoc(doc(ali.db, 'kitchens', kid)));
  await api('member', 'join', { code: inv2.code });
  check('owner hands over and leaves', (await api('owner', 'transfer', { kitchenId: kid, newOwnerId: ali.uid, andLeave: true })).ok === true);
  const k2 = (await getDoc(doc(ali.db, 'kitchens', kid))).data();
  check('new owner is set, old owner gone', k2.ownerId === ali.uid && !k2.memberIds.includes(sara.uid));
  const last = await api('member', 'leave', { kitchenId: kid });
  check('last member leaving deletes the kitchen', last.deleted === true && !(await adminDb().collection('kitchens').doc(kid).get()).exists);

  // Join rate limit
  console.log('Wrong-code limit');
  let r;
  for (let i = 0; i < 5; i++) r = await api('outsider', 'preview', { code: 'ZZZZZ2' });
  check('5 wrong codes', r.error === 'kitchen/bad-code');
  r = await api('outsider', 'preview', { code: 'ZZZZZ3' });
  check('then locked for 10 minutes', r.error === 'kitchen/too-many-tries' && r.retryAfter > 500, JSON.stringify(r));
} catch (err) {
  failed++;
  console.log('  FAIL crashed: ' + (err.stack || err));
} finally {
  await cleanup();
}
console.log(`\n${passed} passed, ${failed} failed. Test users and kitchens deleted.\n`);
process.exit(failed ? 1 : 0);
