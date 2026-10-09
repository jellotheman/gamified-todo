import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseError } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { createAuth } from './firebase-auth.native';

jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('firebase/app', () => ({
  FirebaseError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  getReactNativePersistence: jest.fn(() => ({ type: 'LOCAL' })),
  initializeAuth: jest.fn(),
}));

const app = { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(initializeAuth).mockReset();
});

test('native authentication initializes with AsyncStorage persistence', () => {
  createAuth(app);
  expect(getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);
  expect(initializeAuth).toHaveBeenCalledWith(app, { persistence: { type: 'LOCAL' } });
  expect(getAuth).not.toHaveBeenCalled();
});

test('Fast Refresh reuses authentication when it is already initialized', () => {
  jest.mocked(initializeAuth).mockImplementation(() => {
    throw new FirebaseError('auth/already-initialized', 'Already initialized');
  });
  expect(() => createAuth(app)).not.toThrow();
  expect(getAuth).toHaveBeenCalledWith(app);
});

test('other authentication initialization errors are surfaced', () => {
  const error = new FirebaseError('auth/invalid-api-key', 'Invalid key');
  jest.mocked(initializeAuth).mockImplementation(() => { throw error; });
  expect(() => createAuth(app)).toThrow(error);
  expect(getAuth).not.toHaveBeenCalled();
});
