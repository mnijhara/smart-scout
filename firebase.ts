import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// First-party API calls receive the current Firebase ID token so the server can
// bind mutations to the real authenticated UID instead of a client-supplied ID.
if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const isFirstPartyApi = url.startsWith('/') && url.startsWith('/api/');
    if (!isFirstPartyApi || !auth.currentUser) return nativeFetch(input, init);
    try {
      const token = await auth.currentUser.getIdToken();
      const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      return nativeFetch(input, { ...init, headers });
    } catch {
      return nativeFetch(input, init);
    }
  };
}
