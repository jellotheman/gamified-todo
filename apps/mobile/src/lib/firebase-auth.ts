import { getAuth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';

// Web uses Firebase's browser persistence. Metro chooses .native.ts on devices.
export function createAuth(app: FirebaseApp) {
  return getAuth(app);
}
