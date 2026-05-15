import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let app;
let auth;
let db;
let appId;

try {
  const configJson = import.meta.env.VITE_FIREBASE_CONFIG;
  if (configJson) {
    const firebaseConfig = JSON.parse(configJson);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    appId = import.meta.env.VITE_APP_ID || 'default-app-id';
  }
} catch (e) {
  console.warn('Firebase init info: Running without Firebase config.', e);
}

export { app, auth, db, appId };

export const initialAuthToken = import.meta.env.VITE_INITIAL_AUTH_TOKEN || '';
