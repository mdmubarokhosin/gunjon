/**
 * Admin authentication & user-management helpers.
 *
 * Uses Firebase Realtime Database (RTDB) — NOT Firestore, NOT Storage.
 *
 * ─── Role model ──────────────────────────────────────────────────────
 *
 *   super_admin       Full access. Can manage posts, comments, stats,
 *                     AND create / delete other admin users. There is
 *                     always exactly one super_admin (stored at the
 *                     fixed key `root-admin`); it is created during
 *                     first-time setup and cannot be deleted.
 *
 *   content_admin     Can manage both posts and comments (but not users).
 *
 *   posts_moderator   Can manage posts only.
 *
 *   comments_moderator  Can manage comments only.
 *
 * All roles can view the stats tab.
 *
 * ─── Security note ───────────────────────────────────────────────────
 *
 * This is a static site (Cloudflare Pages) with no server-side runtime,
 * so we cannot truly verify the caller's identity on the server. The
 * RTDB rules therefore allow reads/writes on the `admins` path from
 * any client, and the role check is enforced client-side. Passwords
 * are bcrypt-hashed (12 rounds) so the stored data is safe even if
 * read. For a stricter setup, move to Firebase Auth + custom claims
 * and gate the rules on `auth.token.role`.
 *
 * ─── Persistence ─────────────────────────────────────────────────────
 *
 * On successful login, the admin's id, username, name, role, and an
 * issued-at timestamp are stored in localStorage (8-hour TTL). The
 * role is read back from localStorage on every page load so the UI
 * can show/hide tabs without an extra round-trip.
 */

import { ref, get as rtdbGet, set as rtdbSet, push as rtdbPush, update as rtdbUpdate, remove as rtdbRemove } from 'firebase/database';
import { compare, hash } from 'bcryptjs';
import { rtdb, COLLECTIONS, ADMIN_DOC_ID } from './firebase';

export type AdminRole =
  | 'super_admin'
  | 'content_admin'
  | 'posts_moderator'
  | 'comments_moderator';

export const ADMIN_ROLES: { value: AdminRole; label: string; desc: string }[] = [
  { value: 'super_admin', label: 'সুপার অ্যাডমিন', desc: 'সম্পূর্ণ অ্যাক্সেস — ইউজার ম্যানেজমেন্ট সহ' },
  { value: 'content_admin', label: 'কন্টেন্ট অ্যাডমিন', desc: 'পোস্ট ও মন্তব্য ম্যানেজমেন্ট' },
  { value: 'posts_moderator', label: 'পোস্ট মডারেটর', desc: 'শুধু পোস্ট ম্যানেজমেন্ট' },
  { value: 'comments_moderator', label: 'মন্তব্য মডারেটর', desc: 'শুধু মন্তব্য ম্যানেজমেন্ট' },
];

export function roleLabel(role: string): string {
  return ADMIN_ROLES.find((r) => r.value === role)?.label || role;
}

export function roleDesc(role: string): string {
  return ADMIN_ROLES.find((r) => r.value === role)?.desc || '';
}

/** Which admin tabs a given role can see. */
export function canAccessTab(role: string, tab: 'posts' | 'comments' | 'stats' | 'users'): boolean {
  if (role === 'super_admin') return true;
  if (tab === 'stats') return true;
  if (tab === 'posts') return role === 'content_admin' || role === 'posts_moderator';
  if (tab === 'comments') return role === 'content_admin' || role === 'comments_moderator';
  if (tab === 'users') return role === 'super_admin';
  return false;
}

export interface AdminRecord {
  id: string;
  username: string;
  password: string; // bcrypt hash
  name: string;
  role: AdminRole;
  createdAt: string;
}

const TOKEN_KEY = 'gunjon_admin_token';
const TOKEN_NAME_KEY = 'gunjon_admin_name';
const TOKEN_ROLE_KEY = 'gunjon_admin_role';
const TOKEN_ID_KEY = 'gunjon_admin_id';
const TOKEN_ISSUED_KEY = 'gunjon_admin_token_issued';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

/**
 * A friendly Bengali error message for any Firebase-related error.
 * Falls back to the original message if we don't recognise it.
 */
function friendlyFirebaseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/permission-denied|PERMISSION_DENIED/i.test(msg)) {
    return 'Firebase অনুমতি প্রত্যাখ্যাত। Realtime Database rules ডিপ্লয় করা হয়েছে কিনা যাচাই করুন।';
  }
  if (/not-enabled|has not been used/i.test(msg)) {
    return 'Firebase Realtime Database এই প্রজেক্টে চালু নেই। Firebase Console থেকে Realtime Database enable করুন।';
  }
  if (/network|fetch|offline/i.test(msg)) {
    return 'নেটওয়ার্ক সমস্যা — ইন্টারনেট সংযোগ যাচাই করুন।';
  }
  return msg || 'অজানা সমস্যা হয়েছে';
}

export { friendlyFirebaseError };

/** Default timeout for any RTDB call (10s). */
const RTDB_TIMEOUT_MS = 10_000;

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

function toAdmin(id: string, data: any): AdminRecord {
  return {
    id,
    username: (data.username as string) || '',
    password: (data.password as string) || '',
    name: (data.name as string) || '',
    role: (data.role as AdminRole) || 'posts_moderator',
    createdAt: (data.createdAt as string) || new Date(0).toISOString(),
  };
}

/**
 * Returns true if the super_admin (root-admin) has been set up.
 * This is the "first-time setup" gate.
 */
export async function adminExists(): Promise<boolean> {
  try {
    const snap = await withTimeout(
      rtdbGet(ref(rtdb, `${COLLECTIONS.admins}/${ADMIN_DOC_ID}`)),
    );
    return snap.exists();
  } catch (err) {
    console.warn('adminExists() failed:', err);
    return false;
  }
}

/**
 * Performs the first-time super_admin setup. Throws with a friendly
 * Bengali message if anything goes wrong.
 *
 * This creates the fixed `admins/root-admin` record with role
 * `super_admin`. It can only be called once.
 */
export async function setupAdmin(input: {
  username: string;
  password: string;
  name: string;
}): Promise<void> {
  const username = input.username.trim();
  const name = input.name.trim();

  if (!username || !input.password || !name) {
    throw new Error('সকল তথ্য পূরণ করুন');
  }
  if (input.password.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }
  if (await adminExists()) {
    throw new Error('অ্যাডমিন ইতিমধ্যে সেটআপ করা আছে। লগইন করুন।');
  }

  const hashedPw = await hash(input.password, 12);
  try {
    await withTimeout(
      rtdbSet(ref(rtdb, `${COLLECTIONS.admins}/${ADMIN_DOC_ID}`), {
        username,
        password: hashedPw,
        name,
        role: 'super_admin',
        createdAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Attempts to log in with the given credentials. On success, persists
 * the session (id, username, name, role) to localStorage and returns
 * the admin record (minus the password hash).
 */
export async function loginAdmin(input: {
  username: string;
  password: string;
}): Promise<{ id: string; name: string; role: AdminRole }> {
  const username = input.username.trim();
  if (!username || !input.password) {
    throw new Error('ইউজারনেম এবং পাসওয়ার্ড দিন');
  }

  // Read all admins. RTDB returns the whole subtree at once.
  let admins: AdminRecord[] = [];
  try {
    const snap = await withTimeout(rtdbGet(ref(rtdb, COLLECTIONS.admins)));
    const val = snap.val();
    if (val && typeof val === 'object') {
      admins = Object.entries(val).map(([id, data]) =>
        toAdmin(id, data as any),
      );
    }
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }

  const admin = admins.find((a) => a.username === username);
  if (!admin) {
    throw new Error('ইউজারনেম বা পাসওয়ার্ড ভুল');
  }

  const valid = await compare(input.password, admin.password);
  if (!valid) {
    throw new Error('ইউজারনেম বা পাসওয়ার্ড ভুল');
  }

  // Persist session.
  const issuedAt = Date.now();
  const token = btoa(`${admin.id}:${admin.username}:${issuedAt}`);
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_NAME_KEY, admin.name || admin.username);
    localStorage.setItem(TOKEN_ROLE_KEY, admin.role);
    localStorage.setItem(TOKEN_ID_KEY, admin.id);
    localStorage.setItem(TOKEN_ISSUED_KEY, String(issuedAt));
  }
  return { id: admin.id, name: admin.name || admin.username, role: admin.role };
}

export interface PersistedAdmin {
  token: string;
  name: string;
  role: AdminRole;
  id: string;
}

export function readPersistedAdmin(): PersistedAdmin | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const name = localStorage.getItem(TOKEN_NAME_KEY) || '';
  const role = (localStorage.getItem(TOKEN_ROLE_KEY) as AdminRole) || 'posts_moderator';
  const id = localStorage.getItem(TOKEN_ID_KEY) || '';
  const issuedStr = localStorage.getItem(TOKEN_ISSUED_KEY);
  if (!token || !issuedStr) return null;
  const issued = parseInt(issuedStr, 10);
  if (Number.isNaN(issued)) return null;
  if (Date.now() - issued > TOKEN_TTL_MS) {
    clearPersistedAdmin();
    return null;
  }
  return { token, name, role, id };
}

export function clearPersistedAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_NAME_KEY);
  localStorage.removeItem(TOKEN_ROLE_KEY);
  localStorage.removeItem(TOKEN_ID_KEY);
  localStorage.removeItem(TOKEN_ISSUED_KEY);
}

/* ─── User management (super_admin only) ────────────────────────────── */

/**
 * Lists all admin users. The caller is responsible for checking that
 * the current user is super_admin before calling this (the UI gates it,
 * and RTDB rules allow reads from anyone).
 */
export async function listAdmins(): Promise<Omit<AdminRecord, 'password'>[]> {
  try {
    const snap = await withTimeout(rtdbGet(ref(rtdb, COLLECTIONS.admins)));
    const val = snap.val();
    if (!val || typeof val !== 'object') return [];
    return Object.entries(val).map(([id, data]) => {
      const { password, ...rest } = toAdmin(id, data as any);
      void password;
      return rest;
    });
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Creates a new admin user with the given role. Called by super_admin.
 *
 * Note: super_admin role is reserved for the root-admin record — you
 * cannot create another super_admin through this function.
 */
export async function createSubAdmin(input: {
  username: string;
  password: string;
  name: string;
  role: AdminRole;
}): Promise<string> {
  const username = input.username.trim();
  const name = input.name.trim();

  if (!username || !input.password || !name) {
    throw new Error('সকল তথ্য পূরণ করুন');
  }
  if (input.password.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }
  if (input.role === 'super_admin') {
    throw new Error('নতুন সুপার অ্যাডমিন তৈরি করা যায় না। অন্য রোল নির্বাচন করুন।');
  }

  // Check username uniqueness.
  const existing = await listAdmins();
  if (existing.some((a) => a.username === username)) {
    throw new Error('এই ইউজারনেম ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য নাম বেছে নিন।');
  }

  const hashedPw = await hash(input.password, 12);
  try {
    const newRef = rtdbPush(ref(rtdb, COLLECTIONS.admins), {
      username,
      password: hashedPw,
      name,
      role: input.role,
      createdAt: new Date().toISOString(),
    });
    // rtdbPush returns a ThenableReference which resolves when the
    // write completes. Wait for it so errors are caught.
    await withTimeout(Promise.resolve(newRef));
    return newRef.key as string;
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Deletes an admin user. The root-admin record (super_admin) cannot be
 * deleted through this function — it would lock everyone out.
 */
export async function deleteAdmin(id: string): Promise<void> {
  if (id === ADMIN_DOC_ID) {
    throw new Error('সুপার অ্যাডমিন মুছে ফেলা যায় না।');
  }
  try {
    await withTimeout(rtdbRemove(ref(rtdb, `${COLLECTIONS.admins}/${id}`)));
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}

/**
 * Resets an admin's password. Called by super_admin.
 */
export async function resetAdminPassword(
  id: string,
  newPassword: string,
): Promise<void> {
  if (id === ADMIN_DOC_ID) {
    throw new Error('সুপার অ্যাডমিনের পাসওয়ার্ড এই প্যানেল থেকে পরিবর্তন করা যায় না।');
  }
  if (newPassword.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
  }
  const hashedPw = await hash(newPassword, 12);
  try {
    await withTimeout(
      rtdbUpdate(ref(rtdb, `${COLLECTIONS.admins}/${id}`), { password: hashedPw }),
    );
  } catch (err) {
    throw new Error(friendlyFirebaseError(err));
  }
}
