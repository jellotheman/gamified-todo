export const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV || 'development';
if (appEnvironment !== 'development' && appEnvironment !== 'production') {
  throw new Error('EXPO_PUBLIC_APP_ENV must be development or production.');
}

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

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
