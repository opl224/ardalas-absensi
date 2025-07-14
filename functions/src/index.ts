
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Initialize Firebase Admin SDK.
initializeApp();
const db = getFirestore();
const auth = getAuth();

export const deleteUser = onCall(async (request) => {
  // 1. Authentication and Authorization Checks
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const adminUid = request.auth.uid;
  const {uid: userToDeleteUid, role: userToDeleteRole} = request.data;

  if (!userToDeleteUid || !userToDeleteRole) {
    throw new HttpsError(
        "invalid-argument",
        "The function must be called with 'uid' and 'role' arguments.",
    );
  }

  const adminDoc = await db.collection("admin").doc(adminUid).get();
  if (!adminDoc.exists) {
    throw new HttpsError(
        "permission-denied",
        "You must be an admin to perform this action.",
    );
  }

  // 2. Deletion Logic with Enhanced Error Handling
  try {
    // Delete from Firestore first. It's safer.
    const collectionName =
      userToDeleteRole.toLowerCase() === "admin" ? "admin" : "teachers";
    const userDocRef = db.collection(collectionName).doc(userToDeleteUid);
    
    // Check if the document exists before trying to delete it.
    const docSnap = await userDocRef.get();
    if (docSnap.exists()) {
        await userDocRef.delete();
    } else {
        console.log(`Document for user ${userToDeleteUid} not found in collection ${collectionName}, skipping Firestore deletion.`);
    }
    
    // Now, delete from Firebase Authentication.
    // This block will not fail the function if the user is already deleted.
    try {
        await auth.getUser(userToDeleteUid); // This will throw an error if the user doesn't exist
        await auth.deleteUser(userToDeleteUid);
    } catch (error: any) {
        // If user is not found in Auth, it's not a critical failure.
        // It might have been deleted already. Log it but don't fail the whole function.
        if (error.code === 'auth/user-not-found') {
            console.log(`User ${userToDeleteUid} not found in Firebase Auth, probably already deleted.`);
        } else {
            // For other auth errors, we should still throw to know about them.
            console.error("Error deleting user from Auth:", error);
            throw new HttpsError("internal", "An error occurred during Auth deletion.");
        }
    }

    return {success: true, message: "User deleted successfully."};
  } catch (error: any) {
    console.error("Overall error in deleteUser function:", error);
    // Provide a more specific error message if available, otherwise a generic one.
    if (error instanceof HttpsError) {
        throw error; // Re-throw HttpsError instances directly
    }
    throw new HttpsError(
        "internal",
        error.message || "An unexpected error occurred while deleting the user.",
    );
  }
});
