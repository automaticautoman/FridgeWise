// Test-only stand-in for 'firebase/firestore', used by the end-to-end run when
// the real Firestore emulator isn't available. It keeps documents in
// localStorage and supports just the calls FridgeWise's Epic 1 code makes.
// Security rules are tested separately against the real emulator (npm run test:rules).

const KEY = '__fake_firestore__';
const listeners = new Map();

const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const store = (data) => localStorage.setItem(KEY, JSON.stringify(data));
const SERVER_TS = { __serverTimestamp: true };

function resolve(value) {
  if (value && value.__serverTimestamp) return { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 };
  if (Array.isArray(value)) return value.map(resolve);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v)]));
  }
  return value;
}

function snapshot(ref) {
  const data = load()[ref.path];
  return { id: ref.id, exists: () => data !== undefined, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } };
}

function notify(path) {
  (listeners.get(path) || []).forEach((cb) => cb(snapshot({ path, id: path.split('/').pop() })));
}

export const initializeFirestore = () => ({ fake: true });
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const connectFirestoreEmulator = () => {};
export const serverTimestamp = () => SERVER_TS;
export const doc = (_db, ...segments) => {
  const path = segments.join('/');
  return { path, id: path.split('/').pop() };
};
export async function getDoc(ref) { return snapshot(ref); }
export async function setDoc(ref, data) {
  const all = load(); all[ref.path] = resolve(data); store(all); notify(ref.path);
}
export async function updateDoc(ref, changes) {
  const all = load();
  if (!all[ref.path]) { const e = new Error('No document to update'); e.code = 'not-found'; throw e; }
  const next = { ...all[ref.path] };
  for (const [k, v] of Object.entries(changes)) {
    const parts = k.split('.');
    let o = next;
    for (let i = 0; i < parts.length - 1; i++) { o[parts[i]] = { ...(o[parts[i]] || {}) }; o = o[parts[i]]; }
    o[parts[parts.length - 1]] = resolve(v);
  }
  all[ref.path] = next; store(all); notify(ref.path);
}
export async function runTransaction(_db, fn) {
  const writes = [];
  const tx = { get: async (ref) => snapshot(ref), set: (ref, data) => writes.push([ref, data]) };
  const out = await fn(tx);
  for (const [ref, data] of writes) await setDoc(ref, data);
  return out;
}
// Kitchens (Epic 2) need real Firestore. Here, collection queries just come
// back empty, so the app shows "no kitchen yet" instead of crashing.
export const collection = (_db, ...segments) => ({ path: segments.join('/'), isQuery: true });
export const query = (c) => ({ path: c.path, isQuery: true });
export const where = () => ({});
export const orderBy = () => ({});
export const limit = () => ({});
export const increment = (n) => n;
export const writeBatch = () => {
  const ops = [];
  return {
    set: (ref, data) => ops.push(() => setDoc(ref, data)),
    update: (ref, data) => ops.push(() => updateDoc(ref, data)),
    delete: () => {},
    commit: async () => { for (const op of ops) await op(); }
  };
};

export function onSnapshot(ref, next) {
  if (ref.isQuery) {
    setTimeout(() => next({ docs: [], empty: true, size: 0, metadata: { fromCache: false, hasPendingWrites: false } }), 0);
    return () => {};
  }
  const arr = listeners.get(ref.path) || [];
  arr.push(next); listeners.set(ref.path, arr);
  setTimeout(() => next(snapshot(ref)), 0);
  window.addEventListener('storage', () => next(snapshot(ref)));
  return () => listeners.set(ref.path, (listeners.get(ref.path) || []).filter((f) => f !== next));
}
