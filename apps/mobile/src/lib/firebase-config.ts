import { Platform } from 'react-native';

const emulatorFlag = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS;
if (emulatorFlag !== undefined && emulatorFlag !== 'true' && emulatorFlag !== 'false') {
  throw new Error('EXPO_PUBLIC_USE_FIREBASE_EMULATORS must be true or false.');
}

export const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
if (appEnvironment !== 'development' && appEnvironment !== 'production') {
  throw new Error('EXPO_PUBLIC_APP_ENV must be development or production.');
}

// Emulators are an explicit test option. Normal development uses real cloud services.
export const useFirebaseEmulators = emulatorFlag === 'true';
if (useFirebaseEmulators && appEnvironment === 'production') {
  throw new Error('Production must use cloud Firebase.');
}
export const firebaseConfig = useFirebaseEmulators
  ? { apiKey: 'demo-api-key', projectId: 'demo-gamified-todo', appId: 'demo-gamified-todo-mobile' }
  : {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    };

if (!useFirebaseEmulators) {
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (!value?.trim() || value.startsWith('demo-')) {
      throw new Error(`Cloud Firebase configuration requires a real ${key}. See .env.example.`);
    }
  }
  const expectedProject = appEnvironment === 'production'
    ? 'gamified-todo-prod-jellotheman'
    : 'gamified-todo-dev-jellotheman';
  if (firebaseConfig.projectId !== expectedProject) {
    throw new Error(`${appEnvironment} requires Firebase project ${expectedProject}.`);
  }
}

export const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST
  || (Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1');
export const functionsRegion = 'us-central1';
