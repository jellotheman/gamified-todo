import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runDevelopmentSmokeCheck } from './development-smoke';
import { auth } from './firebase';

jest.mock('@react-native-async-storage/async-storage', () =>
  // Jest's mock factory loads the package's provided storage double.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('./firebase', () => {
  const app = { options: { projectId: 'demo-gamified-todo' } };
  return { firebaseApp: app, auth: { app }, firestore: { app }, functions: { app } };
});

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('storage round-trip removes its temporary key', async () => {
  expect(await runDevelopmentSmokeCheck()).toEqual({ projectId: 'demo-gamified-todo', storage: 'ok', services: 'ok' });
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

test('mismatched Firebase services fail before touching storage', async () => {
  jest.replaceProperty(auth, 'app', { ...auth.app });
  const write = jest.spyOn(AsyncStorage, 'setItem');
  await expect(runDevelopmentSmokeCheck()).rejects.toThrow('do not share');
  expect(write).not.toHaveBeenCalled();
});
