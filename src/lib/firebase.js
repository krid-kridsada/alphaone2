import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app = null;
export let auth = null;
export let db = null;

export const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

try {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (raw) {
    const firebaseConfig = JSON.parse(raw);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error('Firebase init error', e);
}
