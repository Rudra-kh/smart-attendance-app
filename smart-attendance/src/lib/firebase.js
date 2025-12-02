// Firebase initialization placeholder. Replace config values with real project credentials.
// Never commit actual secrets; use environment variables or secure config injection.
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import Constants from 'expo-constants';

// Read from Expo config extras (set in app.json / app.config.js)
const extras = Constants?.expoConfig?.extra || {};
const demoMode = !!extras.demoMode;

// Only initialize Firebase if not in demo mode
let app, auth, db;

if (!demoMode) {
  const firebaseExtra = extras.firebase || {};
  // Provide safe fallbacks so emulator can run without real keys
  const firebaseConfig = {
    apiKey: firebaseExtra.apiKey || 'demo-api-key',
    authDomain: firebaseExtra.authDomain || 'localhost',
    projectId: firebaseExtra.projectId || 'demo-smart-attendance',
    storageBucket: firebaseExtra.storageBucket || 'demo.appspot.com',
    messagingSenderId: firebaseExtra.messagingSenderId || '0',
    appId: firebaseExtra.appId || '1:0:web:demo'
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // In demo mode, export null values
  app = null;
  auth = null;
  db = null;
}

export { auth, db };

// Optional: connect to emulators for local development (only if not in demo mode)
if (!demoMode && app) {
  const emu = extras.emulators || {};
  if (emu.enabled) {
    try {
      const host = emu.host || '127.0.0.1';
      const fsPort = emu.firestorePort || 8080;
      const authPort = emu.authPort || 9099;
      connectFirestoreEmulator(db, host, fsPort);
      connectAuthEmulator(auth, `http://${host}:${authPort}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Emulator connection failed', e);
    }
  }
}
