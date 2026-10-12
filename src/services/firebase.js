// Firebase for the ADMIN PANEL.
//
// Same project as the mobile app (`paguyuban-ev50`), so the panel reads and
// writes the exact documents the drivers' phones do. There is no separate
// admin dataset — if the panel and the app disagree, one of them is lying.
//
// The web config below is NOT a secret. Firebase web API keys are designed to
// be shipped in a browser bundle; they only identify the project, they do not
// grant access. Access is granted (or refused) by firestore.rules, and those
// rules currently enforce data integrity only — see LoginGate.jsx for what
// that means for the password.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68',
  authDomain: 'paguyuban-ev50.firebaseapp.com',
  projectId: 'paguyuban-ev50',
  storageBucket: 'paguyuban-ev50.firebasestorage.app',
  messagingSenderId: '207640068252',
  appId: '1:207640068252:web:50b9c9bdd77a3974892d59',
  measurementId: 'G-GDESFHETEZ'
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export default app;
