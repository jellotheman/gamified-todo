import { initializeApp } from 'firebase-admin/app';
import { onCall } from 'firebase-functions/v2/https';

initializeApp();

/** A minimal callable for verifying client-to-backend connectivity. */
export const health = onCall({ region: 'us-central1' }, () => ({ status: 'ok' }));
