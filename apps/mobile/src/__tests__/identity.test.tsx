import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, onSnapshot, runTransaction } from 'firebase/firestore';
import Index from '../app/index';

jest.mock('../components/task-screen', () => () => null);
jest.mock('../lib/firebase', () => ({ auth: { currentUser: null }, firestore: {} }));
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(), createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(), sendPasswordResetEmail: jest.fn(), signOut: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(), collection: jest.fn(), runTransaction: jest.fn(), onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(),
}));

const observers = new Set<(user: User | null) => void>();
const mockStopSnapshot = jest.fn();
const mockProfile = { exists: () => true, data: () => ({ dailyGoal: 3 }) };
let profileChanged: (snapshot: unknown) => void;
let restorationFailed: (error: Error) => void;
function identityChanged(user: User | null) {
  Object.assign(auth, { currentUser: user });
  for (const observer of [...observers]) observer(user);
}
function user(uid: string, email: string): User { return { uid, email } as User; }
beforeEach(() => {
  jest.clearAllMocks();
  observers.clear();
  Object.assign(auth, { currentUser: null });
  jest.mocked(onAuthStateChanged).mockImplementation((_auth, next, error) => {
    if (typeof next !== 'function') throw new Error('Expected callback');
    observers.add(next);
    if (error) restorationFailed = error;
    return jest.fn(() => { observers.delete(next); });
  });
  jest.mocked(doc).mockReturnValue({ type: 'document' } as ReturnType<typeof doc>);
  jest.mocked(runTransaction).mockImplementation(async (_db, callback) => callback({
    get: async () => mockProfile, set: jest.fn(),
  } as unknown as Parameters<typeof callback>[0]));
  jest.mocked(onSnapshot).mockImplementation((_reference, _options, next?) => {
    profileChanged = next as (snapshot: unknown) => void;
    return mockStopSnapshot;
  });
});

test('restoration failures offer retry without exposing private content', async () => {
  await render(<Index />);
  await act(() => restorationFailed(new Error('unavailable')));
  expect(screen.getByRole('alert')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry session restoration' }));
  expect(screen.getByText('Restoring your session…')).toBeTruthy();
  await act(() => identityChanged(null));
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
});

test('successful registration passes trimmed email and enters the observed authenticated session', async () => {
  await render(<Index />);
  await act(() => identityChanged(null));
  await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
  await fireEvent.changeText(screen.getByLabelText('Email'), '  new@example.com  ');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'private-password');
  jest.mocked(createUserWithEmailAndPassword).mockImplementationOnce(async () => {
    const created = user('owner-new', 'new@example.com');
    identityChanged(created);
    return { user: created, providerId: 'password', operationType: 'signIn' };
  });
  await fireEvent.press(screen.getByRole('button', { name: 'Register' }));
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, 'new@example.com', 'private-password');
  expect(screen.getByText('Your tasks')).toBeTruthy();
  expect(screen.queryByLabelText('Password')).toBeNull();
});

test('private account failures offer retry and unconfirmed local snapshots never show readiness', async () => {
  jest.mocked(runTransaction).mockRejectedValueOnce(new Error('offline'));
  await render(<Index />);
  await act(() => identityChanged(user('owner-a', 'first@example.com')));
  expect(screen.getByRole('button', { name: 'Retry account loading' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry account loading' }));
  await act(() => profileChanged({ ...mockProfile, metadata: { fromCache: true, hasPendingWrites: false } }));
  expect(screen.getByText('Loading your private account…')).toBeTruthy();
  await act(() => profileChanged({ ...mockProfile, metadata: { fromCache: false, hasPendingWrites: true } }));
  expect(screen.getByText('Loading your private account…')).toBeTruthy();
  await act(() => profileChanged({ ...mockProfile, metadata: { fromCache: false, hasPendingWrites: false } }));
  expect(screen.getByText('Your private account is ready.')).toBeTruthy();
});

test('invalid input avoids a network request and a pending sign in blocks duplicate submissions', async () => {
  await render(<Index />);
  await act(() => identityChanged(null));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert').props.children).toContain('valid email');
  expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'private-password');
  let rejectRequest: (error: unknown) => void = () => {};
  jest.mocked(signInWithEmailAndPassword).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRequest = reject; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Working…')).toBeTruthy();
  await act(() => rejectRequest({ code: 'auth/network-request-failed' }));
  expect(screen.getByRole('button', { name: 'Sign in' }).props.accessibilityState.disabled).toBe(false);
});

test('password reset success and unknown email share a generic response; network failure keeps recovery available', async () => {
  await render(<Index />);
  await act(() => identityChanged(null));
  await fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  await fireEvent.press(screen.getByRole('button', { name: 'Forgot password?' }));
  jest.mocked(sendPasswordResetEmail).mockResolvedValueOnce();
  await fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));
  const response = 'If an account exists for this email, you will receive a password reset link.';
  expect(screen.getByText(response)).toBeTruthy();
  jest.mocked(sendPasswordResetEmail).mockRejectedValueOnce({ code: 'auth/user-not-found' });
  await fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));
  expect(screen.getByText(response)).toBeTruthy();
  jest.mocked(sendPasswordResetEmail).mockRejectedValueOnce({ code: 'auth/network-request-failed' });
  await fireEvent.press(screen.getByRole('button', { name: 'Send reset email' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Email').props.value).toBe('person@example.com');
  expect(screen.getByRole('button', { name: 'Back to sign in' })).toBeTruthy();
});

test('account switching detaches private subscriptions and ignores stale private callbacks', async () => {
  await render(<Index />);
  await act(() => identityChanged(user('owner-a', 'first@example.com')));
  expect(screen.getByText('Your tasks')).toBeTruthy();
  expect(screen.getByText('Loading your private account…')).toBeTruthy();
  const staleCallback = profileChanged;
  await act(() => profileChanged({ ...mockProfile, metadata: { fromCache: false, hasPendingWrites: false } }));
  expect(screen.getByText('Your private account is ready.')).toBeTruthy();
  await act(() => identityChanged(user('owner-b', 'second@example.com')));
  expect(mockStopSnapshot).toHaveBeenCalled();
  expect(screen.queryByText('first@example.com')).toBeNull();
  expect(screen.getByText('second@example.com')).toBeTruthy();
  await act(() => staleCallback({ exists: () => false, metadata: { fromCache: false, hasPendingWrites: false } }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByText('Loading your private account…')).toBeTruthy();
});

test('sign out clears private state before acknowledgement and failure has accessible retry', async () => {
  await render(<Index />);
  await act(() => identityChanged(user('owner-a', 'first@example.com')));
  let rejectSignOut: (error: unknown) => void = () => {};
  jest.mocked(signOut).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSignOut = reject; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByText('Your tasks')).toBeNull();
  expect(screen.queryByText('first@example.com')).toBeNull();
  expect(mockStopSnapshot).toHaveBeenCalled();
  await act(() => rejectSignOut({ code: 'auth/network-request-failed' }));
  expect(screen.getByRole('button', { name: 'Retry sign out' })).toBeTruthy();
  jest.mocked(signOut).mockImplementationOnce(async () => { identityChanged(null); });
  await fireEvent.press(screen.getByRole('button', { name: 'Retry sign out' }));
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
});

test('restoration is distinguishable from signed out and sign-in failure preserves input for retry', async () => {
  await render(<Index />);
  expect(screen.getByText('Restoring your session…')).toBeTruthy();
  expect(screen.queryByLabelText('Email')).toBeNull();
  await act(() => identityChanged(null));
  await fireEvent.changeText(screen.getByLabelText('Email'), 'person@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'private-password');
  jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/network-request-failed' });
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert').props.children).toContain('connection');
  expect(screen.getByLabelText('Email').props.value).toBe('person@example.com');
  expect(screen.getByLabelText('Password').props.value).toBe('private-password');
  jest.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/invalid-credential' });
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
  expect(screen.getByRole('alert').props.children).toContain('email and password');
});

test('registration failure offers retry without losing input', async () => {
  await render(<Index />);
  await act(() => identityChanged(null));
  await fireEvent.press(screen.getByRole('button', { name: 'Create an account' }));
  await fireEvent.changeText(screen.getByLabelText('Email'), 'new@example.com');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'private-password');
  jest.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({ code: 'auth/email-already-in-use' });
  await fireEvent.press(screen.getByRole('button', { name: 'Register' }));
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByLabelText('Email').props.value).toBe('new@example.com');
  expect(screen.getByRole('button', { name: 'Register' }).props.accessibilityState.disabled).toBe(false);
});
