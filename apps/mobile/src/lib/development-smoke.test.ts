import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runDevelopmentSmokeCheck } from './development-smoke';
import { auth, firestore } from './firebase';

jest.mock('@react-native-async-storage/async-storage', () =>
  // Jest's mock factory loads the package's provided storage double.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./firebase', () => {
  const app = { options: { projectId: 'gamified-todo-dev-jellotheman' } };
  return { firebaseApp: app, auth: { app }, firestore: { app } };
});

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('storage round-trip removes its temporary key', async () => {
  expect(await runDevelopmentSmokeCheck()).toEqual({ projectId: 'gamified-todo-dev-jellotheman', storage: 'ok', services: 'ok' });
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test('a failed round-trip still removes its temporary key', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockResolvedValueOnce('wrong');
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('round-trip failed');
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

test('storage write failure still attempts cleanup', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage unavailable'));
  const cleanup = jest.spyOn(AsyncStorage, 'removeItem');
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('storage unavailable');
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test.each([['auth', auth], ['firestore', firestore]])('mismatched %s fails before touching storage', async (_name, service) => {
  jest.replaceProperty(service, 'app', { ...service.app });
  const write = jest.spyOn(AsyncStorage, 'setItem');
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('do not share');
  expect(write).not.toHaveBeenCalled();
});

test('a cleanup failure is reported', async () => {
  jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('cleanup unavailable'));
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('cleanup unavailable');
});

test('a leftover temporary key is reported', async () => {
  jest.spyOn(AsyncStorage, 'removeItem').mockResolvedValueOnce(undefined);
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('smoke key cleanup failed');
});

test('production refuses the smoke check before touching storage', async () => {
  const developmentMode = __DEV__;
  Object.defineProperty(global, '__DEV__', { value: false, configurable: true, writable: true });
  const write = jest.spyOn(AsyncStorage, 'setItem');
  try {
    await expect(runDevelopmentSmokeCheck()).rejects.toThrow('disabled in production');
    expect(write).not.toHaveBeenCalled();
  } finally {
    Object.defineProperty(global, '__DEV__', { value: developmentMode, configurable: true, writable: true });
  }
});
