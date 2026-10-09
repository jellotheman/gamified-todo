import { beforeEach, expect, jest, test } from '@jest/globals';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { createAuth } from './firebase-auth';
import { firebaseConfig } from './firebase-config';

jest.mock('firebase/app', () => ({
  getApp: jest.fn(), getApps: jest.fn(), initializeApp: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({ getFirestore: jest.fn((app: unknown) => ({ app })) }));
jest.mock('./firebase-auth', () => ({ createAuth: jest.fn((app: unknown) => ({ app })) }));
jest.mock('./firebase-config', () => ({
  firebaseConfig: { projectId: 'gamified-todo-dev-jellotheman' },
}));

beforeEach(() => {
  jest.clearAllMocks();
});

test.each([false, true])('Firebase initializes shared services (existing app: %s)', (existing) => {
  const app = { name: '[DEFAULT]', options: firebaseConfig, automaticDataCollectionEnabled: false };
  jest.mocked(getApps).mockReturnValue(existing ? [app] : []);
  jest.mocked(getApp).mockReturnValue(app);
  jest.mocked(initializeApp).mockReturnValue(app);

  jest.isolateModules(() => {
    // Re-evaluate initialization as Metro does during module loading.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const services = require('./firebase');
    expect(services.firebaseApp).toBe(app);
    expect(services.auth).toBe(jest.mocked(createAuth).mock.results[0].value);
    expect(services.firestore).toBe(jest.mocked(getFirestore).mock.results[0].value);
  });
  if (existing) {
    expect(initializeApp).not.toHaveBeenCalled();
    expect(getApp).toHaveBeenCalledTimes(1);
  } else {
    expect(initializeApp).toHaveBeenCalledWith(firebaseConfig);
    expect(getApp).not.toHaveBeenCalled();
  }
  expect(createAuth).toHaveBeenCalledWith(app);
  expect(getFirestore).toHaveBeenCalledWith(app);
});
