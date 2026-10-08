import { afterEach, expect, jest, test } from '@jest/globals';

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  jest.resetModules();
});

function loadConfig(environment: Record<string, string> = {}) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('EXPO_PUBLIC_')) delete process.env[key];
  }
  Object.assign(process.env, environment);
  jest.resetModules();
  // Load after setting variables to verify startup validation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./firebase-config');
}

test('cloud development fails clearly when configuration is missing', () => {
  expect(() => loadConfig()).toThrow('requires a real apiKey');
});

test('emulators require an explicit opt-in', () => {
  expect(loadConfig({ EXPO_PUBLIC_USE_FIREBASE_EMULATORS: 'true' }).firebaseConfig.projectId)
    .toBe('demo-gamified-todo');
});

test('production rejects emulator mode', () => {
  expect(() => loadConfig({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_USE_FIREBASE_EMULATORS: 'true' }))
    .toThrow('Production must use cloud Firebase');
});

test.each(['development', 'production'])('%s rejects the other cloud project', (environment) => {
  const wrongProject = environment === 'production' ? 'gamified-todo-dev-jellotheman' : 'gamified-todo-prod-jellotheman';
  expect(() => loadConfig({
    EXPO_PUBLIC_APP_ENV: environment,
    EXPO_PUBLIC_FIREBASE_API_KEY: 'public-test-key',
    EXPO_PUBLIC_FIREBASE_APP_ID: 'public-test-app',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${wrongProject}.firebaseapp.com`,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: wrongProject,
  })).toThrow(`${environment} requires Firebase project`);
});
