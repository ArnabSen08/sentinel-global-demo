import "server-only";
import * as admin from "firebase-admin";

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    if (error.code !== 'auth/invalid-credential') {
      console.error("Firebase admin initialization error", error);
    }
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
