import "server-only";
import * as admin from "firebase-admin";

function initializeAdmin() {
    // If the app is already initialized, return the existing services.
    if (admin.apps.length > 0) {
        return {
            adminDb: admin.firestore(),
            adminAuth: admin.auth(),
            isFirebaseAdminInitialized: true,
        };
    }

    try {
        const serviceAccount: admin.ServiceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
        };

        // Check if essential credentials are provided.
        if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
            console.warn("Firebase Admin credentials are not set. Admin features will be disabled.");
            return { adminDb: {} as any, adminAuth: {} as any, isFirebaseAdminInitialized: false };
        }

        // Initialize the app with the service account.
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        // Return the initialized services.
        return {
            adminDb: admin.firestore(),
            adminAuth: admin.auth(),
            isFirebaseAdminInitialized: true,
        };
    } catch (error: any) {
        console.error("Firebase admin initialization error:", error.message);
        // Return dummy objects if initialization fails.
        return { adminDb: {} as any, adminAuth: {} as any, isFirebaseAdminInitialized: false };
    }
}

export const { adminDb, adminAuth, isFirebaseAdminInitialized } = initializeAdmin();
