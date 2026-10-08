import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, deleteUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const projectId = 'demo-gamified-todo';
test('Auth, callable health, Admin Firestore, and default-deny client rules', { timeout: 60000 }, async () => {
  // Fail closed: this test must never contact a cloud project.
  assert.equal(process.env.GCLOUD_PROJECT, projectId);
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099');
  const admin = initializeAdmin({ projectId }, `admin-${randomUUID()}`);
  const app = initializeApp({ projectId, apiKey: 'demo-api-key', authDomain: `${projectId}.firebaseapp.com` }, randomUUID());
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const adminDoc = getAdminFirestore(admin).doc(`smoke/${randomUUID()}`);
  const clientDoc = doc(db, adminDoc.path);
  try {
    await assert.rejects(getDoc(clientDoc), { code: 'permission-denied' });
    const credential = await signInAnonymously(auth);
    assert.equal(credential.user.isAnonymous, true);
    assert.ok(credential.user.uid);
    assert.deepEqual((await httpsCallable(functions, 'health')()).data, { status: 'ok' });
    await adminDoc.set({ message: 'Hello World' });
    assert.deepEqual((await adminDoc.get()).data(), { message: 'Hello World' });
    await assert.rejects(getDoc(clientDoc), { code: 'permission-denied' });
    await assert.rejects(setDoc(clientDoc, { message: 'blocked' }), { code: 'permission-denied' });
    await adminDoc.delete();
    assert.equal((await adminDoc.get()).exists, false);
  } finally {
    await adminDoc.delete();
    if (auth.currentUser) await deleteUser(auth.currentUser);
    await terminate(db);
    await deleteApp(app);
    await deleteAdmin(admin);
  }
});
