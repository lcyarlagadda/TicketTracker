import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDWIqX4_PWOt0Icu4sn__b-pUBVWqtSjHQ",
  authDomain: "tickettracker-bed2d.firebaseapp.com",
  projectId: "tickettracker-bed2d",
  storageBucket: "tickettracker-bed2d.firebasestorage.app",
  messagingSenderId: "513074723891",
  appId: "1:513074723891:web:2e2884843a6e1f342d3746",
  measurementId: "G-KNWQXWCK4E",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
