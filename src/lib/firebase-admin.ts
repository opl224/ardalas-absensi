
import * as admin from 'firebase-admin';

const appName = 'firebase-admin-app-school-attendance';

// This function initializes the admin app if it hasn't been initialized yet.
export function getAdminApp() {
  if (admin.apps.some(app => app?.name === appName)) {
    return admin.app(appName);
  }

  // Ensure environment variables are loaded and present.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    // Fallback for environments where direct env vars are used
    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY_STRING) {
       const serviceAccount = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY_STRING.replace(/\\n/g, '\n'),
      };
       return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }, appName);
    }
    throw new Error('The FIREBASE_PRIVATE_KEY environment variable is not set.');
  }

  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key needs to have its escaped newlines replaced with actual newlines.
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  }, appName);
}
