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

initializeApp();

export const deleteUser = onCall(async (request) => {
  // Check if the user is authenticated.
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
        "The function must be called with a 'uid' and 'role' argument.",
    );
  }

  // Check if the caller is an admin.
  const db = getFirestore();
  const adminDoc = await db.collection("admin").doc(adminUid).get();
  if (!adminDoc.exists) {
    throw new HttpsError(
        "permission-denied",
        "You must be an admin to perform this action.",
    );
  }

  try {
    // Delete from Firebase Authentication
    await getAuth().deleteUser(userToDeleteUid);

    // Delete from Firestore
    const collectionName =
      userToDeleteRole.toLowerCase() === "admin" ? "admin" : "teachers";
    await db.collection(collectionName).doc(userToDeleteUid).delete();

    return {success: true, message: "User deleted successfully."};
  } catch (error: any) {
    console.error("Error deleting user:", error);
    throw new HttpsError(
        "internal",
        "An error occurred while deleting the user.",
        error.message,
    );
  }
});
