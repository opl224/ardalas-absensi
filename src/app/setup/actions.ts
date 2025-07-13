

'use server';

import { getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Variabel lingkungan Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) tidak diatur. Harap konfigurasikan file .env Anda.");
    }
    
    const firebaseConfig = {
        credential: {
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
        },
        databaseURL: `https://${projectId}.firebaseio.com`,
    };

    if (getApps().some(app => app.name === 'firebase-admin')) {
        return getApp('firebase-admin');
    } else {
        return initializeApp(firebaseConfig, 'firebase-admin');
    }
}

export async function createAdminUser() {
  const adminEmail = 'admin@sdn.id';
  const adminPassword = '123456';

  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const firestore = getFirestore(adminApp);

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(adminEmail);
      console.log('User already exists:', userRecord.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create user in Firebase Auth
        userRecord = await auth.createUser({
          email: adminEmail,
          password: adminPassword,
          displayName: 'Admin Utama',
          emailVerified: true,
          disabled: false,
        });
        console.log('Successfully created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }

    const { uid } = userRecord;

    // Create user document in Firestore 'admin' collection
    const adminDocRef = firestore.collection('admin').doc(uid);
    await adminDocRef.set({
      name: 'Admin Utama',
      email: adminEmail,
      role: 'admin',
      avatar: 'https://placehold.co/100x100.png',
    });

    console.log('Admin document created/updated in Firestore.');

    return { success: `Admin user ${adminEmail} created successfully with UID ${uid}. You can now log in.` };
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    return { error: error.message };
  }
}

