import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, firebaseApp, firestore, functions } from './firebase';

/** Explicit local wiring check; no sign-in, network request, or application UI. */
export async function runDevelopmentSmokeCheck() {
  if (!__DEV__) throw new Error('Development smoke checks are disabled in production.');
  if (auth.app !== firebaseApp || firestore.app !== firebaseApp || functions.app !== firebaseApp) {
    throw new Error('Firebase services do not share the configured app.');
  }
  const key = `@gamified-todo/smoke/${Date.now()}/${Math.random()}`;
  try {
    await AsyncStorage.setItem(key, 'ok');
    if (await AsyncStorage.getItem(key) !== 'ok') {
      throw new Error('AsyncStorage round-trip failed.');
    }
  } finally {
    await AsyncStorage.removeItem(key);
  }
  if (await AsyncStorage.getItem(key) !== null) {
    throw new Error('AsyncStorage smoke key cleanup failed.');
  }
  return { projectId: firebaseApp.options.projectId, storage: 'ok', services: 'ok' };
}
