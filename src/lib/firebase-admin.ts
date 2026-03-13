import "server-only";
import * as admin from "firebase-admin";

function initializeAdmin() {
    if (admin.apps.length > 0) {
        return {
            adminDb: admin.firestore(),
            adminAuth: admin.auth(),
            isFirebaseAdminInitialized: true,
        };
    }

    try {
        // Try to initialize using the environment's default service account
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });

        console.log("Firebase Admin initialized successfully using Application Default Credentials.");

        return {
            adminDb: admin.firestore(),
            adminAuth: admin.auth(),
            isFirebaseAdminInitialized: true,
        };
    } catch (error: any) {
        console.warn(`Could not initialize Firebase Admin with Application Default Credentials. 
This is expected in local development without GOOGLE_APPLICATION_CREDENTIALS set. 
Admin features will be disabled. Error: ${error.message}`);
        
        // Fallback for local dev or misconfigured environments
        return { 
            adminDb: {} as any, 
            adminAuth: {} as any, 
            isFirebaseAdminInitialized: false 
        };
    }
}

export const { adminDb, adminAuth, isFirebaseAdminInitialized } = initializeAdmin();
