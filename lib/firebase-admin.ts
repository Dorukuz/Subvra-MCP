import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

function getFirebaseAdmin(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  // Fallback: no credentials (will fail on actual auth calls)
  return initializeApp({ projectId: projectId || "demo-project" });
}

const adminApp = getFirebaseAdmin();
export const adminAuth: Auth = getAuth(adminApp);
export default adminApp;
