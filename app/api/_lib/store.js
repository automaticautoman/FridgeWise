// Where reset codes live while they're valid.
//   firestore (default): passwordResetOtps/{key}, written only by the Admin SDK.
//     Security rules deny all client access to this collection.
//   memory: in-process Map, for local development without the Firestore
//     emulator. Don't use it on Vercel: each function instance has its own memory.
//
// update(key, fn) runs fn(current) atomically. fn returns { next, result }:
// next undefined = leave as is, null = delete, object = replace.
import { adminDb } from './admin.js';

const COLLECTION = 'passwordResetOtps';

function memoryStore() {
  const map = globalThis.__fwOtpMemory || (globalThis.__fwOtpMemory = new Map());
  return {
    async update(key, fn) {
      const { next, result } = fn(map.get(key) || null);
      if (next === null) map.delete(key);
      else if (next !== undefined) map.set(key, next);
      return result;
    }
  };
}

function firestoreStore() {
  const db = adminDb();
  return {
    update(key, fn) {
      const ref = db.collection(COLLECTION).doc(key);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const { next, result } = fn(snap.exists ? snap.data() : null);
        if (next === null) tx.delete(ref);
        else if (next !== undefined) tx.set(ref, next);
        return result;
      });
    }
  };
}

export function getStore() {
  return process.env.OTP_STORE === 'memory' ? memoryStore() : firestoreStore();
}
