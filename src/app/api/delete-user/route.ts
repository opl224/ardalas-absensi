
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json();
    const authorization = request.headers.get('Authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    
    if (!userId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 });
    }

    const idToken = authorization.split('Bearer ')[1];
    
    const app = getAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);

    // Verify admin token
    const decodedToken = await auth.verifyIdToken(idToken);
    const adminDocRef = db.collection('admin').doc(decodedToken.uid);
    const adminDoc = await adminDocRef.get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Not an admin' }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (decodedToken.uid === userId) {
      return NextResponse.json({ error: 'Admins cannot delete their own account' }, { status: 403 });
    }

    // 1. Delete user from Firebase Authentication
    await auth.deleteUser(userId);

    // 2. Delete user from Firestore collection
    const collectionName = role.toLowerCase() === 'admin' ? 'admin' : 'teachers';
    await db.collection(collectionName).doc(userId).delete();

    return NextResponse.json({ message: 'User deleted successfully' }, { status: 200 });

  } catch (error: any) {
    console.error('API Error deleting user:', error);
    let errorMessage = 'An unexpected error occurred.';
    let statusCode = 500;

    if (error.code === 'auth/user-not-found') {
        errorMessage = 'Pengguna tidak ditemukan di sistem autentikasi.';
        statusCode = 404;
    } else if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        errorMessage = 'Sesi admin tidak valid. Silakan login kembali.';
        statusCode = 401;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
