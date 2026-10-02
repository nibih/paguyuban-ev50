// Firebase Configuration & Service Initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Default config template with fallback local mock for offline/initial setup
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyMockKeyForPaguyubanEV50Transjakarta",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "paguyuban-ev50.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "paguyuban-ev50",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "paguyuban-ev50.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "720510945000",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:720510945000:web:88921a99011137"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
