import { doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';

export const ALLERGENS = ['Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat / gluten', 'Soy', 'Fish', 'Shellfish', 'Sesame'];

export function profileRef(uid) {
  return doc(db, 'users', uid);
}

// While sign-up is still saving the profile, the app shouldn't try to
// "repair" a missing one at the same time.
export const signupState = { inProgress: false };

// Creates users/{uid} only if it doesn't exist yet, so two callers can't
// overwrite each other.
export async function createProfile(user, name) {
  const ref = profileRef(user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) return;
    tx.set(ref, {
      name: (name || user.displayName || 'Chef').trim().slice(0, 60) || 'Chef',
      email: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      onboarding: { completed: false, kitchenChoice: null },
      notifications: { explained: false, permission: 'default' },
      dietary: { vegetarian: false, halal: false, allergens: [] }
    });
  });
}

// Google sign-ins may be new, or an older account missing its profile.
export function ensureProfile(user) {
  return createProfile(user, user.displayName);
}

export function saveProfile(uid, changes) {
  return updateDoc(profileRef(uid), { ...changes, updatedAt: serverTimestamp() });
}
