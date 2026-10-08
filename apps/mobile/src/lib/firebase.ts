import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { createAuth } from './firebase-auth';
import { emulatorHost, firebaseConfig, functionsRegion, useFirebaseEmulators } from './firebase-config';

const existingApp = getApps().find((app) => app.name === '[DEFAULT]');
export const firebaseApp = existingApp ? getApp() : initializeApp(firebaseConfig);
export const auth = createAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp, functionsRegion);

// Emulator connectors must run once, before any service operation, including HMR.
if (useFirebaseEmulators && !existingApp) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(firestore, emulatorHost, 8080);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
}
