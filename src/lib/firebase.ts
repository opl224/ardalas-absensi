import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAh0_X_WAkTDMBY30lSM32CyR99TQ15_DQ",
  authDomain: "absensi-guru-18.firebaseapp.com",
  projectId: "absensi-guru-18",
  storageBucket: "absensi-guru-18.firebasestorage.com",
  messagingSenderId: "830665801797",
  appId: "1:830665801797:web:6e368fbaf7ae067971232c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
