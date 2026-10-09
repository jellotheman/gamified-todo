import { afterEach, expect, jest, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

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
  EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyDnZnOchr8UCw3LXSfWSw0DKqahYaChDG0',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:1062431403819:web:5af6597c61fcbc39b6df6e',
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
    EXPO_PUBLIC_FIREBASE_API_KEY: 'AIzaSyC2oiAfio-kfIlMAksg7wSuEto0LZAU1yw',
    EXPO_PUBLIC_FIREBASE_APP_ID: '1:126696046144:web:9974e13bb62a0277e9a9a5',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  });
  expect(config.appEnvironment).toBe('production');
  expect(config.firebaseConfig.projectId).toBe(projectId);
});

test.each(['EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_APP_ID', 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'])(
  'mixed-project %s cannot authenticate against a different account store', (field) => {
    expect(() => loadConfig({ ...developmentConfig, [field]: 'other-project-value' })).toThrow('development requires Firebase');
  },
);

test('production rejects a development Auth API key despite a valid production project ID', () => {
  expect(() => loadConfig({
    ...developmentConfig, EXPO_PUBLIC_APP_ENV: 'production',
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'gamified-todo-prod-jellotheman',
    EXPO_PUBLIC_FIREBASE_APP_ID: '1:126696046144:web:9974e13bb62a0277e9a9a5',
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'gamified-todo-prod-jellotheman.firebaseapp.com',
  })).toThrow('production requires Firebase apiKey');
});

test('app source and example environment expose only approved public configuration, never account credentials', () => {
  function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(path) && !path.includes('.test.') ? [path] : [];
    });
  }
  const source = [...sourceFiles(join(__dirname, '..')), join(__dirname, '../../.env.example'), join(__dirname, '../../app.config.js')]
    .map((path) => readFileSync(path, 'utf8')).join('\n');
  const allowed = new Set([
    'EXPO_PUBLIC_APP_ENV', 'EXPO_PUBLIC_FIREBASE_API_KEY', 'EXPO_PUBLIC_FIREBASE_APP_ID',
    'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'EXPO_PUBLIC_RUN_DEVELOPMENT_SMOKE',
  ]);
  const publicVariables = source.match(/EXPO_PUBLIC_[A-Z0-9_]+/g) ?? [];
  expect(publicVariables.filter((name) => !allowed.has(name))).toEqual([]);
  // Development account login must always come from user-entered inputs.
  expect(source).not.toMatch(/(?:signInWithEmailAndPassword|createUserWithEmailAndPassword)\(auth,\s*['"]/);
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
