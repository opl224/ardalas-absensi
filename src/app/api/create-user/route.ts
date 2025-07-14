
import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();
    const authorization = request.headers.get('Authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    
    const idToken = authorization.split('Bearer ')[1];
    
    const app = getAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);

    // Verifikasi token admin
    const decodedToken = await auth.verifyIdToken(idToken);
    const adminDocRef = db.collection('admin').doc(decodedToken.uid);
    const adminDoc = await adminDocRef.get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Not an admin' }, { status: 403 });
    }

    // Buat pengguna baru
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    const collectionName = role === 'admin' ? 'admin' : 'teachers';
    const userDocRef = db.collection(collectionName).doc(userRecord.uid);
    
    const userData = {
        name,
        email,
        role,
        uid: userRecord.uid,
        avatar: `https://placehold.co/100x100.png`
    };

    await userDocRef.set(userData);
    
    return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' }, { status: 201 });

  } catch (error: any) {
    console.error('API Error creating user:', error);
    let errorMessage = 'An unexpected error occurred.';
    let statusCode = 500;

    if (error.code === 'auth/email-already-exists') {
        errorMessage = 'Alamat email ini sudah digunakan oleh akun lain.';
        statusCode = 409;
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = 'Kata sandi tidak valid. Harus minimal 6 karakter.';
        statusCode = 400;
    } else if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
        errorMessage = 'Sesi admin tidak valid. Silakan login kembali.';
        statusCode = 401;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
