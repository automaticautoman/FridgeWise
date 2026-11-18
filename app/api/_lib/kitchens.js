// Epic 2: kitchens and sharing (F06–F13), server side.
//
// Every membership change runs here with the Admin SDK, so the browser can
// never add itself to a kitchen, make itself owner or read invite codes.
// The browser only *reads* kitchens it belongs to (firestore.rules) and
// listens for live changes (F12).
//
// Data model
//   kitchens/{kitchenId}
//     name, type ('shared' | 'private'), ownerId, memberIds [uid],
//     memberCount, locations [string], invitePolicy ('anyone' | 'owner'),
//     createdAt, updatedAt
//   kitchens/{kitchenId}/members/{uid}
//     name, role ('owner' | 'member'), joinedAt
//   kitchens/{kitchenId}/activity/{id}       (F13)
//     type, actorId, actorName, targetId?, targetName?, at
//   kitchens/{kitchenId}/items/{id}          (Epic 3; used here only on leave)
//     ownerId, shared (bool), ...
//   kitchens/{kitchenId}/private/invite      server only
//     code, expiresAt, issued [ms]
//   invites/{code}                           server only
//     kitchenId, createdBy, createdAt, expiresAt, revoked
//   joinAttempts/{uid}                       server only
//     fails [ms], lockedUntil (ms)
import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './admin.js';
import { ApiError } from './auth.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const INVITE_TTL = 7 * DAY;          // SRS NFR13 (the Join mockup says 48 hours)
const CODES_PER_HOUR = 5;                    // "You can make up to N new codes an hour"
const JOIN_MAX_FAILS = 5;                    // JoinError mockup: 5 wrong tries...
const JOIN_LOCK = 10 * MINUTE;               // ...then wait 10 minutes
const MAX_MEMBERS = 30;
const MAX_KITCHENS_PER_USER = 10;
const MAX_LOCATIONS = 8;
export const DEFAULT_LOCATIONS = ['Fridge', 'Pantry', 'Cupboard'];
// No 0/O, 1/I/L: codes get read out loud (Invite mockup).
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

const db = () => adminDb();
const kitchenRef = (id) => db().collection('kitchens').doc(id);
const memberRef = (kid, uid) => kitchenRef(kid).collection('members').doc(uid);
const inviteMetaRef = (kid) => kitchenRef(kid).collection('private').doc('invite');
const inviteRef = (code) => db().collection('invites').doc(code);
const attemptsRef = (uid) => db().collection('joinAttempts').doc(uid);
const userRef = (uid) => db().collection('users').doc(uid);

const fail = (status, code) => { throw new ApiError(status, code); };
const ok = (body = { ok: true }) => ({ status: 200, body });

// ---------- input checks ----------

function cleanName(v, max) {
  const s = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
  return s.length >= 1 && s.length <= max ? s : null;
}

function cleanLocations(v) {
  if (v === undefined) return DEFAULT_LOCATIONS;
  if (!Array.isArray(v) || v.length < 1 || v.length > MAX_LOCATIONS) fail(400, 'kitchen/invalid-locations');
  const out = [];
  for (const raw of v) {
    const s = cleanName(raw, 24);
    if (!s) fail(400, 'kitchen/invalid-locations');
    if (!out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
  }
  return out;
}

export function normalizeCode(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validKitchenId(v) {
  if (typeof v !== 'string' || !/^[A-Za-z0-9]{10,40}$/.test(v)) fail(400, 'kitchen/not-found');
  return v;
}

function newCode() {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  return s;
}

// ---------- helpers ----------

async function displayName(token) {
  const snap = await userRef(token.uid).get();
  const fromProfile = snap.exists ? snap.data().name : null;
  return cleanName(fromProfile || token.name || (token.email || '').split('@')[0] || 'Member', 60) || 'Member';
}

function activity(tx, kitchenId, entry) {
  tx.create(kitchenRef(kitchenId).collection('activity').doc(), { ...entry, at: FieldValue.serverTimestamp() });
}

// Reads the kitchen and checks the caller belongs to it. Outsiders get the
// same "not found" as a missing kitchen, so ids can't be probed (F07).
async function loadAsMember(tx, kitchenId, uid) {
  const snap = await tx.get(kitchenRef(kitchenId));
  if (!snap.exists || !(snap.data().memberIds || []).includes(uid)) fail(404, 'kitchen/not-found');
  return snap.data();
}

function canInvite(k, uid) {
  if (k.type !== 'shared') return false;
  return k.invitePolicy === 'owner' ? k.ownerId === uid : true;
}

// FR2.4: personal items go, shared items stay with the kitchen.
async function deletePersonalItems(kitchenId, uid) {
  const items = kitchenRef(kitchenId).collection('items');
  const snap = await items.where('ownerId', '==', uid).where('shared', '==', false).get();
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db().batch();
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function clearActiveKitchen(uid, kitchenId) {
  const ref = userRef(uid);
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data().activeKitchenId === kitchenId) tx.update(ref, { activeKitchenId: null });
  });
}

async function deleteKitchen(kitchenId) {
  const meta = await inviteMetaRef(kitchenId).get();
  if (meta.exists && meta.data().code) await inviteRef(meta.data().code).delete().catch(() => {});
  await db().recursiveDelete(kitchenRef(kitchenId));
}

// ---------- F06 create ----------

async function create(token, body) {
  const name = cleanName(body.name, 40);
  if (!name) fail(400, 'kitchen/invalid-name');
  const type = body.type === 'private' ? 'private' : body.type === 'shared' ? 'shared' : null;
  if (!type) fail(400, 'kitchen/invalid-type');
  const locations = cleanLocations(body.locations);

  const mine = await db().collection('kitchens').where('memberIds', 'array-contains', token.uid).count().get();
  if (mine.data().count >= MAX_KITCHENS_PER_USER) fail(409, 'kitchen/too-many-kitchens');

  const who = await displayName(token);
  const ref = db().collection('kitchens').doc();
  await db().runTransaction(async (tx) => {
    tx.create(ref, {
      name, type, locations,
      ownerId: token.uid,
      memberIds: [token.uid],
      memberCount: 1,
      invitePolicy: 'anyone',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.create(memberRef(ref.id, token.uid), { name: who, role: 'owner', joinedAt: FieldValue.serverTimestamp() });
    activity(tx, ref.id, { type: 'kitchen-created', actorId: token.uid, actorName: who });
    tx.set(userRef(token.uid), { activeKitchenId: ref.id }, { merge: true });
  });
  return ok({ kitchenId: ref.id });
}

// ---------- settings (owner) ----------

async function update(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  const changes = {};
  if (body.name !== undefined) {
    changes.name = cleanName(body.name, 40);
    if (!changes.name) fail(400, 'kitchen/invalid-name');
  }
  if (body.locations !== undefined) changes.locations = cleanLocations(body.locations);
  if (body.invitePolicy !== undefined) {
    if (!['anyone', 'owner'].includes(body.invitePolicy)) fail(400, 'kitchen/invalid-policy');
    changes.invitePolicy = body.invitePolicy;
  }
  if (!Object.keys(changes).length) fail(400, 'kitchen/nothing-to-change');

  await db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (k.ownerId !== token.uid) fail(403, 'kitchen/owner-only');
    tx.update(kitchenRef(kitchenId), { ...changes, updatedAt: FieldValue.serverTimestamp() });
  });
  return ok();
}

// ---------- F08 invites ----------

async function invite(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  const renew = body.renew === true;
  const now = Date.now();

  return db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (k.type !== 'shared') fail(409, 'kitchen/private');
    if (!canInvite(k, token.uid)) fail(403, 'kitchen/invites-owner-only');
    const metaSnap = await tx.get(inviteMetaRef(kitchenId));
    const meta = metaSnap.exists ? metaSnap.data() : {};

    if (!renew && meta.code && meta.expiresAt > now) {
      return ok({ code: meta.code, expiresAt: meta.expiresAt });
    }
    // peek: just show the current code (Members screen), don't make one.
    if (body.peek === true) return ok({ code: null, expiresAt: null });
    const issued = (meta.issued || []).filter((t) => now - t < HOUR);
    if (issued.length >= CODES_PER_HOUR) fail(429, 'kitchen/too-many-codes');

    // Pick a code nobody else is using.
    let code = null;
    for (let i = 0; i < 5 && !code; i++) {
      const c = newCode();
      const taken = await tx.get(inviteRef(c));
      if (!taken.exists || taken.data().expiresAt < now || taken.data().revoked) code = c;
    }
    if (!code) fail(503, 'kitchen/try-again');

    const expiresAt = now + INVITE_TTL;
    if (meta.code) tx.set(inviteRef(meta.code), { revoked: true }, { merge: true }); // a new code turns the old one off
    tx.set(inviteRef(code), { kitchenId, createdBy: token.uid, createdAt: now, expiresAt, revoked: false });
    tx.set(inviteMetaRef(kitchenId), { code, expiresAt, issued: [...issued, now] });
    return ok({ code, expiresAt });
  });
}

async function revokeInvite(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  await db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (!canInvite(k, token.uid)) fail(403, 'kitchen/invites-owner-only');
    const metaSnap = await tx.get(inviteMetaRef(kitchenId));
    if (!metaSnap.exists || !metaSnap.data().code) return;
    tx.set(inviteRef(metaSnap.data().code), { revoked: true }, { merge: true });
    tx.set(inviteMetaRef(kitchenId), { code: null, expiresAt: 0 }, { merge: true });
  });
  return ok();
}

// ---------- F09 join ----------

// Wrong codes count per person: 5 in a row locks joining for 10 minutes.
async function checkLock(uid, now) {
  const snap = await attemptsRef(uid).get();
  const until = snap.exists ? snap.data().lockedUntil || 0 : 0;
  if (until > now) throw Object.assign(new ApiError(429, 'kitchen/too-many-tries'), { retryAfter: Math.ceil((until - now) / 1000) });
}

async function recordFail(uid, now) {
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(attemptsRef(uid));
    const fails = ((snap.exists && snap.data().fails) || []).filter((t) => now - t < JOIN_LOCK);
    fails.push(now);
    const locked = fails.length >= JOIN_MAX_FAILS;
    tx.set(attemptsRef(uid), { fails: locked ? [] : fails, lockedUntil: locked ? now + JOIN_LOCK : 0 });
  });
}

const resetFails = (uid) => attemptsRef(uid).delete().catch(() => {});

// Finds the kitchen behind a code, or throws the one error the screen shows
// for every bad code (wrong, expired, revoked, or a private kitchen).
async function resolveCode(tx, rawCode, uid, now) {
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) return null;
  const inv = await tx.get(inviteRef(code));
  if (!inv.exists) return null;
  const i = inv.data();
  if (i.revoked || i.expiresAt <= now) return null;
  const kSnap = await tx.get(kitchenRef(i.kitchenId));
  if (!kSnap.exists || kSnap.data().type !== 'shared') return null;
  return { code, kitchenId: i.kitchenId, kitchen: kSnap.data() };
}

async function withCode(token, body, fn) {
  const now = Date.now();
  await checkLock(token.uid, now);
  try {
    return await db().runTransaction(async (tx) => {
      const found = await resolveCode(tx, body.code, token.uid, now);
      if (!found) fail(400, 'kitchen/bad-code');
      return fn(tx, found, now);
    });
  } catch (err) {
    if (err.code === 'kitchen/bad-code') await recordFail(token.uid, now);
    throw err;
  }
}

async function preview(token, body) {
  const result = await withCode(token, body, async (tx, { kitchenId, kitchen }) => {
    const owner = await tx.get(memberRef(kitchenId, kitchen.ownerId));
    const members = await tx.get(kitchenRef(kitchenId).collection('members').orderBy('joinedAt').limit(4));
    return ok({
      kitchenId,
      name: kitchen.name,
      type: kitchen.type,
      memberCount: kitchen.memberCount,
      ownerName: owner.exists ? owner.data().name : null,
      memberNames: members.docs.map((d) => d.data().name),
      alreadyMember: kitchen.memberIds.includes(token.uid)
    });
  });
  await resetFails(token.uid);
  return result;
}

async function join(token, body) {
  const who = await displayName(token);
  const result = await withCode(token, body, async (tx, { kitchenId, kitchen }) => {
    if (kitchen.memberIds.includes(token.uid)) return ok({ kitchenId, alreadyMember: true });
    if (kitchen.memberCount >= MAX_MEMBERS) fail(409, 'kitchen/full');
    tx.update(kitchenRef(kitchenId), {
      memberIds: FieldValue.arrayUnion(token.uid),
      memberCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.set(memberRef(kitchenId, token.uid), { name: who, role: 'member', joinedAt: FieldValue.serverTimestamp() });
    activity(tx, kitchenId, { type: 'member-joined', actorId: token.uid, actorName: who });
    tx.set(userRef(token.uid), { activeKitchenId: kitchenId }, { merge: true });
    return ok({ kitchenId, alreadyMember: false });
  });
  await resetFails(token.uid);
  return result;
}

// ---------- F11 leave / remove ----------

async function leave(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  const who = await displayName(token);
  const outcome = await db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (k.memberIds.length === 1) return 'delete';
    // Owner must hand over first while others remain (SRS 8.4 item 5).
    if (k.ownerId === token.uid) fail(409, 'kitchen/transfer-first');
    tx.update(kitchenRef(kitchenId), {
      memberIds: FieldValue.arrayRemove(token.uid),
      memberCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.delete(memberRef(kitchenId, token.uid));
    activity(tx, kitchenId, { type: 'member-left', actorId: token.uid, actorName: who });
    return 'left';
  });
  if (outcome === 'delete') await deleteKitchen(kitchenId);
  else await deletePersonalItems(kitchenId, token.uid);
  await clearActiveKitchen(token.uid, kitchenId);
  return ok({ ok: true, deleted: outcome === 'delete' });
}

async function removeMember(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  const memberId = typeof body.memberId === 'string' ? body.memberId : '';
  if (memberId === token.uid) fail(400, 'kitchen/use-leave');
  await db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (k.ownerId !== token.uid) fail(403, 'kitchen/owner-only');
    if (!k.memberIds.includes(memberId)) fail(404, 'kitchen/not-a-member');
    const [owner, target] = await Promise.all([tx.get(memberRef(kitchenId, token.uid)), tx.get(memberRef(kitchenId, memberId))]);
    tx.update(kitchenRef(kitchenId), {
      memberIds: FieldValue.arrayRemove(memberId),
      memberCount: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp()
    });
    tx.delete(memberRef(kitchenId, memberId));
    activity(tx, kitchenId, {
      type: 'member-removed',
      actorId: token.uid, actorName: owner.exists ? owner.data().name : 'Owner',
      targetId: memberId, targetName: target.exists ? target.data().name : 'A member'
    });
  });
  await deletePersonalItems(kitchenId, memberId);
  await clearActiveKitchen(memberId, kitchenId);
  return ok();
}

// ---------- transfer ownership ----------

async function transfer(token, body) {
  const kitchenId = validKitchenId(body.kitchenId);
  const newOwnerId = typeof body.newOwnerId === 'string' ? body.newOwnerId : '';
  if (newOwnerId === token.uid) fail(400, 'kitchen/already-owner');
  await db().runTransaction(async (tx) => {
    const k = await loadAsMember(tx, kitchenId, token.uid);
    if (k.ownerId !== token.uid) fail(403, 'kitchen/owner-only');
    if (!k.memberIds.includes(newOwnerId)) fail(404, 'kitchen/not-a-member');
    const [oldM, newM] = await Promise.all([tx.get(memberRef(kitchenId, token.uid)), tx.get(memberRef(kitchenId, newOwnerId))]);
    tx.update(kitchenRef(kitchenId), { ownerId: newOwnerId, updatedAt: FieldValue.serverTimestamp() });
    tx.update(memberRef(kitchenId, token.uid), { role: 'member' });
    tx.update(memberRef(kitchenId, newOwnerId), { role: 'owner' });
    activity(tx, kitchenId, {
      type: 'owner-changed',
      actorId: token.uid, actorName: oldM.exists ? oldM.data().name : 'Owner',
      targetId: newOwnerId, targetName: newM.exists ? newM.data().name : 'A member'
    });
  });
  // TransferOwnership mockup: "Make Ali owner and leave".
  if (body.andLeave === true) return leave(token, { kitchenId });
  return ok();
}

// ---------- router ----------

const ACTIONS = { create, update, invite, revokeInvite, preview, join, leave, removeMember, transfer };

export async function handleKitchen(body, token) {
  const fn = Object.prototype.hasOwnProperty.call(ACTIONS, body.action) ? ACTIONS[body.action] : null;
  if (!fn) fail(400, 'kitchen/unknown-action');
  try {
    return await fn(token, body);
  } catch (err) {
    if (err instanceof ApiError && err.retryAfter) return { status: err.httpStatus, body: { error: err.code, retryAfter: err.retryAfter } };
    throw err;
  }
}

