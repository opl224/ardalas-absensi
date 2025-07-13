const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.createUser = onCall(async (request) => {
  // Check if the user is authenticated.
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check if the authenticated user is an admin.
  if (request.auth.token.role !== 'admin') {
      throw new HttpsError('permission-denied', 'Only admins can create new users.');
  }

  const { email, password, name, role } = request.data;

  if (!email || !password || !name || !role) {
    throw new HttpsError('invalid-argument', 'The function must be called with arguments "email", "password", "name", and "role".');
  }

  const auth = getAuth();
  const firestore = getFirestore();

  try {
    // Create the user in Firebase Authentication.
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // Set a custom claim for the user's role.
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Determine the collection and data for Firestore.
    const collectionName = role === 'admin' ? 'admin' : 'teachers';
    const userData = {
      name,
      email,
      role,
      uid: userRecord.uid,
    };

    // Create a document for the user in the appropriate Firestore collection.
    // Use the UID from Auth as the document ID for consistency.
    await firestore.collection(collectionName).doc(userRecord.uid).set(userData);

    return { result: `Successfully created user ${email} with role ${role}.` };

  } catch (error) {
    console.error("Error creating new user:", error);
    if (error.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    throw new HttpsError('internal', 'An error occurred while creating the user.', error);
  }
});
