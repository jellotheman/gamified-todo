import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { createAuth } from './firebase-auth';
import { firebaseConfig } from './firebase-config';

const existingApp = getApps().find((app) => app.name === '[DEFAULT]');
export const firebaseApp = existingApp ? getApp() : initializeApp(firebaseConfig);
export const auth = createAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
