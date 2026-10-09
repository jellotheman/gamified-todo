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

// Approved public web-app identifiers. Auth uses apiKey to select its account
// store, so checking projectId alone cannot prevent a mixed-project login.
// Rotate these public identifiers alongside the environment files when needed.
const approvedWebApp = appEnvironment === 'production' ? {
  apiKey: 'AIzaSyC2oiAfio-kfIlMAksg7wSuEto0LZAU1yw',
  appId: '1:126696046144:web:9974e13bb62a0277e9a9a5',
  authDomain: 'gamified-todo-prod-jellotheman.firebaseapp.com',
} : {
  apiKey: 'AIzaSyDnZnOchr8UCw3LXSfWSw0DKqahYaChDG0',
  appId: '1:1062431403819:web:5af6597c61fcbc39b6df6e',
  authDomain: 'gamified-todo-dev-jellotheman.firebaseapp.com',
};
for (const field of ['apiKey', 'appId', 'authDomain'] as const) {
  if (firebaseConfig[field] !== approvedWebApp[field]) {
    throw new Error(`${appEnvironment} requires Firebase ${field} for its approved web app.`);
  }
}
