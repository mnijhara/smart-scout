import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { ResumeAnalysis } from '../types';

// Operation types for error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const isVirtual = false;

// Export a dummy supabase object for compatibility if needed, but we'll use direct functions
export const supabase: any = {
  auth: {
    signInWithGoogle: async () => {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user ? { ...result.user, id: result.user.uid } : null;
        return { data: { user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error };
      }
    },
    signInWithOtp: async ({ email }: { email: string }) => {
      // Firebase Auth Magic Link setup is complex, defaulting to a mock success for now
      // or we can suggest Google Login.
      console.log("OTP requested for", email);
      return { error: null };
    },
    verifyOtp: async ({ email, token }: { email: string, token: string, type: string }) => {
      // Mocking OTP verification for now as Firebase setup is different
      console.log("Verifying OTP", token, "for", email);
      const user = auth.currentUser ? { ...auth.currentUser, id: auth.currentUser.uid } : null;
      return { data: { user }, error: null };
    },
    getSession: async () => {
      const user = auth.currentUser ? { ...auth.currentUser, id: auth.currentUser.uid } : null;
      return { data: { session: user ? { user } : null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        const normalizedUser = user ? { ...user, id: user.uid } : null;
        callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', normalizedUser ? { user: normalizedUser } : null);
      });
      return { data: { subscription: { unsubscribe } } };
    },
    signOut: () => signOut(auth),
  }
};

export const updateUserCredits = async (credits: number) => {
    if (!auth.currentUser) return null;
    try {
        // In Firebase, we store credits in a user document
        await setDoc(doc(db, 'users', auth.currentUser.uid), { credits }, { merge: true });
        return credits;
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        return null;
    }
};

export const addCreditsToUser = async (creditsToAdd: number): Promise<number | null> => {
    if (!auth.currentUser) return null;
    try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const currentCredits = userDoc.exists() ? (userDoc.data().credits || 0) : 0;
        const newTotalCredits = currentCredits + creditsToAdd;
        await setDoc(doc(db, 'users', auth.currentUser.uid), { credits: newTotalCredits }, { merge: true });
        return newTotalCredits;
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        return null;
    }
};

export const saveBenchmarkingSession = async (userId: string, jobTitle: string, jobDescription: string, results: ResumeAnalysis[]) => {
  try {
    const jobRef = await addDoc(collection(db, 'jobs'), {
      user_id: userId,
      title: jobTitle,
      description: jobDescription,
      created_at: serverTimestamp()
    });
    
    // Batch insert analyses (Firestore doesn't have a native batch insert like Supabase, but we can loop or use WriteBatch)
    const analysisPromises = results.map(res => 
      addDoc(collection(db, 'analyses'), {
        user_id: userId, 
        job_id: jobRef.id, 
        candidate_name: res.candidateName, 
        file_name: res.fileName, 
        score: res.overallScore, 
        summary: res.summary, 
        breakdown: res.breakdown, 
        pros: res.pros, 
        cons: res.cons, 
        extracted_text: res.extractedText,
        created_at: serverTimestamp()
      })
    );

    await Promise.all(analysisPromises);
    return jobRef.id;
  } catch (err) { 
    handleFirestoreError(err, OperationType.WRITE, 'jobs/analyses');
    return null; 
  }
};

export const getHistoricalPool = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'analyses'), 
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) { 
    handleFirestoreError(err, OperationType.LIST, 'analyses');
    return []; 
  }
};

export const saveInterviewSession = async (session: any) => {
  try {
    // Firestore does not support undefined values. Deep clean them.
    const deepClean = (obj: any): any => {
      if (obj === null || obj === undefined) return null;
      if (Array.isArray(obj)) return obj.map(deepClean);
      // Don't mess with Firestore Timestamp or FieldValue objects
      if (typeof obj === 'object' && obj !== null) {
        if (typeof obj.toDate === 'function' || obj.isEqual) return obj;
        return Object.fromEntries(
          Object.entries(obj).map(([k, v]) => [k, deepClean(v)])
        );
      }
      return obj;
    };

    const cleanSession = deepClean(session);

    const sessionData = {
      ...cleanSession,
      created_at: session.created_at || serverTimestamp()
    };
    await setDoc(doc(db, 'interview_sessions', session.id), sessionData, { merge: true });
    return session.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `interview_sessions/${session.id}`);
    return null;
  }
};

export const updateInterviewSession = async (sessionId: string, data: any) => {
  try {
    await setDoc(doc(db, 'interview_sessions', sessionId), data, { merge: true });
    return true;
  } catch (err) {
    console.error("Error updating interview session:", err);
    handleFirestoreError(err, OperationType.UPDATE, `interview_sessions/${sessionId}`);
    return false;
  }
};

export const getInterviewSession = async (sessionId: string) => {
  try {
    console.log("Fetching interview session from Firestore for ID:", sessionId);
    const docSnap = await getDoc(doc(db, 'interview_sessions', sessionId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.status === 'completed') {
        console.warn("Interview session already completed for ID:", sessionId);
        return null; // Expired
      }
      console.log("Interview session found:", data);
      return data;
    }
    console.warn("Interview session document does not exist for ID:", sessionId);
    return null;
  } catch (err) {
    console.error("Error fetching interview session:", err);
    handleFirestoreError(err, OperationType.GET, `interview_sessions/${sessionId}`);
    return null;
  }
};
