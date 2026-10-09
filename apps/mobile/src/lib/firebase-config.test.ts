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

test('startup fails clearly when Firebase configuration is missing', () => {
  expect(() => loadConfig()).toThrow('requires a real apiKey');
});

const developmentConfig = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'public-test-key',
  EXPO_PUBLIC_FIREBASE_APP_ID: 'public-test-app',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'gamified-todo-dev-jellotheman.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'gamified-todo-dev-jellotheman',
};

test('configured startup defaults to the development Firebase project', () => {
  const config = loadConfig(developmentConfig);
  expect(config.appEnvironment).toBe('development');
  expect(config.firebaseConfig.projectId).toBe(developmentConfig.EXPO_PUBLIC_FIREBASE_PROJECT_ID);
});

test('production accepts its own Firebase project', () => {
  const projectId = 'gamified-todo-prod-jellotheman';
  const config = loadConfig({
    ...developmentConfig,
    EXPO_PUBLIC_APP_ENV: 'production',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  });
  expect(config.appEnvironment).toBe('production');
  expect(config.firebaseConfig.projectId).toBe(projectId);
});

test('an unsupported environment fails clearly', () => {
  expect(() => loadConfig({ ...developmentConfig, EXPO_PUBLIC_APP_ENV: 'preview' }))
    .toThrow('EXPO_PUBLIC_APP_ENV must be development or production');
});

test.each([
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'apiKey'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'projectId'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'appId'],
])('%s rejects missing, blank, or demo configuration', (variable, field) => {
  const missingConfig: Record<string, string> = { ...developmentConfig };
  delete missingConfig[variable];
  expect(() => loadConfig(missingConfig)).toThrow(`requires a real ${field}`);
  for (const value of ['', '   ', 'demo-placeholder']) {
    expect(() => loadConfig({ ...developmentConfig, [variable]: value }))
      .toThrow(`requires a real ${field}`);
  }
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
