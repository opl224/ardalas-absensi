
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  let auth;
  try {
    const app = getAdminApp();
    auth = admin.auth(app);
    const db = admin.firestore(app);
    
    const { uid, role } = await request.json();
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    const adminDocRef = db.collection('admin').doc(decodedToken.uid);
    const adminDoc = await adminDocRef.get();
    
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Unauthorized: Not an admin' }, { status: 403 });
    }

    if (!uid || !role) {
        return NextResponse.json({ error: 'User ID and role are required.' }, { status: 400 });
    }
    
    // Determine collection and delete from Firestore
    const collectionName = role.toLowerCase() === 'admin' ? 'admin' : 'teachers';
    const userDocRef = db.collection(collectionName).doc(uid);
    
    try {
        const docSnap = await userDocRef.get();
        if (docSnap.exists()) {
            await userDocRef.delete();
        }
    } catch (dbError: any) {
        console.error(`Firestore deletion error for UID ${uid} in collection ${collectionName}:`, dbError);
        // Don't fail the whole function, just log it. Maybe the doc was already gone.
    }

    // Delete from Firebase Authentication
    try {
        await auth.deleteUser(uid);
        return NextResponse.json({ success: true, message: 'User deleted successfully.' }, { status: 200 });
    } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
            console.log(`User ${uid} not found in Firebase Auth, likely already deleted. Considering this a success.`);
            return NextResponse.json({ success: true, message: 'User was already deleted from Auth.' }, { status: 200 });
        }
        console.error(`Auth deletion error for UID ${uid}:`, authError);
        return NextResponse.json({ error: authError.message || 'Error deleting user from Authentication.' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Overall error in delete-user API route:', error);
    if (error.code === 'auth/id-token-expired') {
        return NextResponse.json({ error: 'Admin session expired. Please log in again.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'An unexpected error occurred on the server.' }, { status: 500 });
  }
}
