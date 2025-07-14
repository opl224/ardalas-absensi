
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAh0_X_WAkTDMBY30lSM32CyR99TQ15_DQ",
  authDomain: "absensi-guru-18.firebaseapp.com",
  projectId: "absensi-guru-18",
  storageBucket: "absensi-guru-18.appspot.com",
  messagingSenderId: "830665801797",
  appId: "1:830665801797:web:6e368fbaf7ae067971232c"
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { app, auth, db, storage, functions };

