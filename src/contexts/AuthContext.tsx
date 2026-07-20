import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { auth, db } from '@/db/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  sendEmailVerification, 
  signOut as firebaseSignOut, 
  User 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId?: string): Promise<Profile | null> {
  if (!userId) return null;
  
  let attempts = 0;
  const maxAttempts = 5;
  const delayMs = 500;
  
  while (attempts < maxAttempts) {
    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as Profile;
      }
    } catch (error) {
      console.error(`Failed to fetch profile (attempt ${attempts + 1}):`, error);
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return null;
}

interface SignInResult {
  error: Error | null;
  userId?: string;
  needsVerification?: boolean;
}

interface AuthContextType {
  user: User | null; 
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<SignInResult>;
  verifyEmailCode: (email: string, code: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  debug: { loadingProfile: boolean; hasUser: boolean; userId: string | undefined };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const applyRoleOverride = (u: User | null, p: Profile | null): Profile | null => {
    if (!p) return null;
    return p;
  };

  useEffect(() => {
    const isNewSession = !sessionStorage.getItem('ll_session_active');
    const rememberMe = localStorage.getItem('ll_remember_me');

    if (isNewSession) {
      sessionStorage.setItem('ll_session_active', 'true');
      if (rememberMe === 'false') {
        localStorage.removeItem('ll_remember_me');
        firebaseSignOut(auth).catch(console.error);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentUser = userRef.current;
      const currentProfile = profileRef.current;

      // Polyfill user.id for compatibility with 150+ components expecting Supabase's user.id
      if (firebaseUser) {
        (firebaseUser as any).id = firebaseUser.uid;
      }

      setUser(firebaseUser);
      
      if (firebaseUser) {
        const isSameUser = currentUser && currentUser.uid === firebaseUser.uid;
        const hasProfile = !!currentProfile;
        const shouldShowLoading = !isSameUser || !hasProfile;

        if (shouldShowLoading) {
          setLoading(true);
        }

        const data = await getProfile(firebaseUser.uid);
        setProfile(applyRoleOverride(firebaseUser, data));
        
        if (shouldShowLoading) {
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.uid);
    setProfile(applyRoleOverride(user, profileData));
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Ensure profile exists for new Google users
      const profileData = await getProfile(result.user.uid);
      if (!profileData) {
        await setDoc(doc(db, 'profiles', result.user.uid), {
          id: result.user.uid,
          email: result.user.email,
          full_name: result.user.displayName,
          avatar_url: result.user.photoURL,
          role: 'student',
          created_at: new Date().toISOString()
        });
      }
      
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<SignInResult> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        return { error: new Error('Email not confirmed'), needsVerification: true };
      }
      
      return { error: null, userId: userCredential.user.uid };
    } catch (err: any) {
      return { error: new Error('Invalid email or password.') };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<SignInResult> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create profile in Firestore
      await setDoc(doc(db, 'profiles', userCredential.user.uid), {
        id: userCredential.user.uid,
        email: email,
        full_name: fullName,
        role: 'student',
        created_at: new Date().toISOString()
      });

      await sendEmailVerification(userCredential.user);
      
      return { error: null, userId: userCredential.user.uid, needsVerification: true };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const verifyEmailCode = async (email: string, code: string): Promise<SignInResult> => {
    // Firebase Auth handles email verification via a standard link, not a 6-digit code usually.
    // If we need code verification, we'll need to mock it or handle it via a custom Firebase Function.
    // For now, we will return an error instructing them to click the link.
    return { error: new Error('Please click the verification link sent to your email.') };
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        return { error: null };
      }
      return { error: new Error('User not logged in') };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('ll_remember_me');
    sessionStorage.removeItem('ll_session_active');
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithEmail, signUpWithEmail, verifyEmailCode,
      signInWithGoogle, resendVerificationEmail,
      signOut, refreshProfile,
      debug: { loadingProfile: loading, hasUser: !!user, userId: user?.uid }
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
