import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAdb91WvbgIdjCNiWynpYI-cPEctRp_6kE",
  authDomain: "mon-tamagotchi.firebaseapp.com",
  projectId: "mon-tamagotchi",
  storageBucket: "mon-tamagotchi.firebasestorage.app",
  messagingSenderId: "760019091300",
  appId: "1:760019091300:web:2bad4f35c7d3c68cb68471",
  measurementId: "G-HC6JXWW72B"
};

// Initialisation avec vérification pour éviter les doubles initialisations
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };