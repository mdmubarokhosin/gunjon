/**
 * Thin wrapper around firebase/database (Realtime Database) that
 * surfaces errors instead of swallowing them, and adds a timeout
 * so the UI never hangs forever if RTDB is unreachable.
 *
 * Every helper here either returns the data or throws — the caller
 * is responsible for showing an error toast.
 *
 * ─── RTDB vs Firestore note ─────────────────────────────────────────
 *
 * RTDB stores data as a JSON tree. A "collection" is just a top-level
 * key whose value is an object. Each child key is the record id (we
 * use push() to generate unique ids), and the value is the record
 * data.
 *
 *   posts: {
 *     "-NXabc123": { title: "...", content: "...", status: "pending" },
 *     "-NXdef456": { ... }
 *   }
 *
 * Reading a path returns the entire subtree as a single object, or
 * null if the path doesn't exist. We convert that to/from an array
 * of { id, ...data } records for the caller.
 */

import {
  ref,
  get as rtdbGet,
  set as rtdbSet,
  push as rtdbPush,
  update as rtdbUpdate,
  remove as rtdbRemove,
  type Database,
} from 'firebase/database';
import { rtdb, COLLECTIONS } from './firebase';
import { friendlyFirebaseError } from './admin-auth';

export interface DocRecord {
  id: string;
  [key: string]: unknown;
}

/** Default timeout for any RTDB call (10s). */
const RTDB_TIMEOUT_MS = 10_000;

/**
 * Wrap an RTDB promise with a timeout. If the underlying SDK is
 * stuck waiting for a response (e.g. network down), we reject with
 * a friendly error so the UI can move on.
 */
function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          'অনুরোধ সময়ের মধ্যে সম্পন্ন হয়নি। ইন্টারনেট সংযোগ বা Firebase কনফিগ যাচাই করুন।',
        ),
      );
    }, RTDB_TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Convert an RTDB snapshot object into an array of { id, ...data }
 * records. Returns [] if the snapshot is null/empty.
 */
function snapshotToRecords(snapshotVal: unknown): DocRecord[] {
  if (!snapshotVal || typeof snapshotVal !== 'object') return [];
  const obj = snapshotVal as Record<string, any>;
  return Object.entries(obj).map(([id, data]) => ({
    id,
    ...(data && typeof data === 'object' ? data : {}),
  }));
}

/**
 * Get all records under a top-level path as an array of
 * { id, ...data } objects.
 *
 * NOTE: RTDB reads the entire subtree in one shot. For very large
 * collections (10k+ records) you'd want server-side pagination, but
 * the free tier (1 GB total) makes that unlikely for this app.
 */
export async function getAll(
  collectionName: keyof typeof COLLECTIONS,
): Promise<DocRecord[]> {
  try {
    const snap = await withTimeout(rtdbGet(ref(rtdb, COLLECTIONS[collectionName])));
    return snapshotToRecords(snap.val());
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Get a single record by id, or null if missing.
 */
export async function getOne(
  collectionName: keyof typeof COLLECTIONS,
  id: string,
): Promise<DocRecord | null> {
  try {
    const snap = await withTimeout(
      rtdbGet(ref(rtdb, `${COLLECTIONS[collectionName]}/${id}`)),
    );
    const val = snap.val();
    if (!val || typeof val !== 'object') return null;
    return { id, ...val };
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Create a new record with an auto-generated push id.
 * Returns the new id.
 */
export async function create(
  collectionName: keyof typeof COLLECTIONS,
  data: Record<string, unknown>,
): Promise<string> {
  try {
    const listRef = ref(rtdb, COLLECTIONS[collectionName]);
    const newRef = rtdbPush(listRef, data);
    // rtdbPush returns a ThenableReference which resolves when the
    // write completes. Wait for it so errors are caught.
    await withTimeout(Promise.resolve(newRef));
    return newRef.key as string;
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Patch a single record by id. Only the fields in `patch` are
 * overwritten; other fields are left untouched.
 */
export async function update(
  collectionName: keyof typeof COLLECTIONS,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  try {
    await withTimeout(
      rtdbUpdate(ref(rtdb, `${COLLECTIONS[collectionName]}/${id}`), patch),
    );
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Delete a single record by id.
 */
export async function remove(
  collectionName: keyof typeof COLLECTIONS,
  id: string,
): Promise<void> {
  try {
    await withTimeout(rtdbRemove(ref(rtdb, `${COLLECTIONS[collectionName]}/${id}`)));
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Set (overwrite) a record at a specific id. Used by the admin setup
 * to write to the fixed `admins/root-admin` key.
 */
export async function setAt(
  collectionName: keyof typeof COLLECTIONS,
  id: string,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    await withTimeout(
      rtdbSet(ref(rtdb, `${COLLECTIONS[collectionName]}/${id}`), data),
    );
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Get a single record by id from a specific path, returning the raw
 * value (not wrapped in { id, ...data }). Used by admin-auth to read
 * the root-admin record directly.
 */
export async function getRaw(
  collectionName: keyof typeof COLLECTIONS,
  id: string,
): Promise<any | null> {
  try {
    const snap = await withTimeout(
      rtdbGet(ref(rtdb, `${COLLECTIONS[collectionName]}/${id}`)),
    );
    return snap.val();
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

// Re-export rtdb for callers that need direct access (admin-auth).
export { rtdb, type Database };
