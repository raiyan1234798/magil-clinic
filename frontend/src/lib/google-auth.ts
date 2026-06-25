/**
 * Google / Firebase OAuth scaffolding for future employee sign-in.
 * Current auth uses email/password with a dev bypass — do not remove that flow yet.
 *
 * Future integration steps:
 * 1. Create Firebase project and enable Google sign-in provider
 * 2. Add Firebase config to NEXT_PUBLIC_FIREBASE_* env vars
 * 3. Call signInWithGoogle() from login page
 * 4. Backend: match user by googleId or email, issue JWT
 */

export type GoogleAuthUser = {
  googleId: string;
  email: string;
  name: string;
  photoUrl?: string;
};

/** Placeholder — returns null until Firebase is configured. */
export async function signInWithGoogle(): Promise<GoogleAuthUser | null> {
  // import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
  // const auth = getAuth();
  // const result = await signInWithPopup(auth, new GoogleAuthProvider());
  // return { googleId: result.user.uid, email: result.user.email!, name: result.user.displayName || '' };
  console.info("[google-auth] Google sign-in not yet configured. Use email/password for now.");
  return null;
}

/** Placeholder for linking Google account to existing employee record. */
export async function linkGoogleAccount(_employeeId: string): Promise<boolean> {
  return false;
}
