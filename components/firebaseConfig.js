import { initializeApp } from 'firebase/app';
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);