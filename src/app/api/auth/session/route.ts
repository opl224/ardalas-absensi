import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true }, { status: 200 });

    // The middleware expects a cookie named 'firebaseIdToken'.
    // Firebase ID tokens are valid for 1 hour. We can set the cookie expiry to match.
    const expiresIn = 60 * 60 * 1000; // 1 hour in milliseconds
    response.cookies.set('firebaseIdToken', idToken, {
      httpOnly: true, // For security
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000, // maxAge is in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
