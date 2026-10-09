import {
  createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail,
  signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import { auth } from './firebase';

export interface Identity { uid: string; email: string | null }

export const identity = {
  observe: (next: (user: Identity | null) => void, error: (error: unknown) => void) =>
    onAuthStateChanged(auth, next, error),
  signIn: (email: string, password: string) => signInWithEmailAndPassword(auth, email.trim(), password),
  register: (email: string, password: string) => createUserWithEmailAndPassword(auth, email.trim(), password),
  resetPassword: async (email: string) => {
    try { await sendPasswordResetEmail(auth, email.trim()); }
    catch (error) {
      // Older projects without email enumeration protection can return this error.
      // Show exactly the same response as a successful reset request.
      if (errorCode(error) !== 'auth/user-not-found') throw error;
    }
  },
  signOut: () => signOut(auth),
};

export function errorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code : '';
}

export function authMessage(error: unknown): string {
  switch (errorCode(error)) {
    case 'auth/network-request-failed': return 'Check your connection and try again.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/weak-password': case 'auth/password-does-not-meet-requirements':
      return 'Choose a stronger password, then try again.';
    case 'auth/email-already-in-use': return 'Unable to register. Try signing in or resetting your password.';
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': case 'auth/user-disabled':
      return 'Check your email and password, then try again.';
    default: return 'Unable to finish. Please try again.';
  }
}
