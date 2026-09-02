import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

/**
 * Firebase configuration — read EXCLUSIVELY from environment variables.
 *
 * There is NO demo fallback. The app uses whatever values are baked
 * into the build at compile time (from `.env.local` in dev, or from
 * your hosting provider's environment settings in production).
 *
 * ─── Data layer ────────────────────────────────────────────────────
 *
 * This app uses **Realtime Database (RTDB)** exclusively — NOT
 * Firestore, and NOT Firebase Storage. RTDB is chosen because:
 *
 *   1. It is fully covered by the Firebase Spark (free) plan —
 *      1 GB storage, 10K concurrent connections, 10 GB/month
 *      downloads.
 *   2. It stores data as a JSON tree, which maps cleanly to the
 *      post/comment/admin model in this app.
 *   3. No paid services are required at any scale the app is
 *      likely to reach.
 *
 * Firebase Storage is explicitly NOT used — the `storage.rules` file
 * has been removed and `firebase.json` does not deploy storage rules.
 *
 * All values are NEXT_PUBLIC_* because the Firebase web SDK needs them
 * client-side. They are not secret — security is enforced by the rules
 * in `database.rules.json`, not by hiding these values.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Warn (not throw) if any critical var is missing — this helps debugging
// without breaking the app boot if only optional vars are missing.
if (typeof window !== 'undefined') {
  const missing = [
    'apiKey',
    'databaseURL',
    'projectId',
    'appId',
  ].filter((k) => !firebaseConfig[k as keyof typeof firebaseConfig]);
  if (missing.length > 0) {
    console.error(
      `[Gunjon] Missing Firebase env vars: ${missing.join(', ')}. ` +
        `Set NEXT_PUBLIC_FIREBASE_* in .env.local (dev) or your hosting provider (prod).`,
    );
  }
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

/**
 * The Realtime Database handle. All data operations go through this.
 */
export const rtdb = getDatabase(app);

/**
 * Top-level paths (keys) in the RTDB JSON tree. Centralising them
 * avoids string drift between components.
 *
 * The tree looks like:
 *   {
 *     posts:         { "-NXabc": { ... }, ... },
 *     comments:      { "-NXdef": { ... }, ... },
 *     admins:        { "root-admin": { ... }, "-NXghi": { ... }, ... },
 *     contactMessages: { "-NXjkl": { ... }, ... }
 *   }
 */
export const COLLECTIONS = {
  posts: 'posts',
  comments: 'comments',
  admins: 'admins',
  contactMessages: 'contactMessages',
} as const;

/**
 * The fixed key used to store the single super-admin record.
 * Using a deterministic key lets us cheaply check whether setup is
 * already complete (a single get() instead of reading the whole tree),
 * and lets the RTDB rules lock writes down to "create-only".
 */
export const ADMIN_DOC_ID = 'root-admin';
