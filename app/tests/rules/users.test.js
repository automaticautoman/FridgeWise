import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let env;

const profile = (email, extra = {}) => ({
  name: 'Sara Khan',
  email,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  onboarding: { completed: false, kitchenChoice: null },
  notifications: { explained: false, permission: 'default' },
  dietary: { vegetarian: false, halal: true, allergens: ['Peanuts'] },
  ...extra
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fridgewise',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 }
  });
});
beforeEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const as = (uid, email) => env.authenticatedContext(uid, { email }).firestore();

describe('users/{uid}', () => {
  it('lets a user create their own profile', async () => {
    const db = as('sara', 'sara@example.com');
    await assertSucceeds(setDoc(doc(db, 'users/sara'), profile('sara@example.com')));
  });

  it("blocks creating someone else's profile", async () => {
    const db = as('ali', 'ali@example.com');
    await assertFails(setDoc(doc(db, 'users/sara'), profile('ali@example.com')));
  });

  it('blocks signed-out reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users/sara')));
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com')));
  });

  it('blocks a profile whose email does not match the account', async () => {
    const db = as('sara', 'sara@example.com');
    await assertFails(setDoc(doc(db, 'users/sara'), profile('someone@else.com')));
  });

  it('blocks a user from giving themselves an admin role', async () => {
    const db = as('sara', 'sara@example.com');
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com', { role: 'admin' })));
    await setDoc(doc(db, 'users/sara'), profile('sara@example.com'));
    await assertFails(updateDoc(doc(db, 'users/sara'), { role: 'admin' }));
  });

  it('rejects empty or overly long names', async () => {
    const db = as('sara', 'sara@example.com');
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com', { name: '' })));
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com', { name: 'x'.repeat(61) })));
  });

  it('lets a user read and update their own profile but not change createdAt', async () => {
    const db = as('sara', 'sara@example.com');
    await setDoc(doc(db, 'users/sara'), profile('sara@example.com'));
    await assertSucceeds(getDoc(doc(db, 'users/sara')));
    await assertSucceeds(updateDoc(doc(db, 'users/sara'), { 'onboarding.completed': true, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, 'users/sara'), { createdAt: serverTimestamp() }));
  });

  it("blocks reading another user's profile", async () => {
    await as('sara', 'sara@example.com');
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/sara'), { name: 'Sara', email: 'sara@example.com' });
    });
    await assertFails(getDoc(doc(as('ali', 'ali@example.com'), 'users/sara')));
  });

  it('validates dietary preferences', async () => {
    const db = as('sara', 'sara@example.com');
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com', { dietary: { vegan: 'yes' } })));
    await assertFails(setDoc(doc(db, 'users/sara'), profile('sara@example.com', { dietary: { halal: 'yes' } })));
  });

  it('blocks deleting a profile from the client', async () => {
    const db = as('sara', 'sara@example.com');
    await setDoc(doc(db, 'users/sara'), profile('sara@example.com'));
    await assertFails(deleteDoc(doc(db, 'users/sara')));
  });
});

describe('passwordResetOtps/{key}', () => {
  it('is closed to every client, signed in or not', async () => {
    const db = as('sara', 'sara@example.com');
    await assertFails(getDoc(doc(db, 'passwordResetOtps/abc')));
    await assertFails(setDoc(doc(db, 'passwordResetOtps/abc'), { codeHash: 'x' }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'passwordResetOtps/abc')));
  });
});
