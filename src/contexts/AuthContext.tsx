import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';
import { useUser, useSignIn, useSignUp, useClerk } from '@clerk/clerk-react';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
  return data;
}

export async function createProfile(userId: string, email: string, fullName: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .insert([{ id: userId, email, full_name: fullName, role: 'student' }])
    .select('*')
    .single();

  if (error) {
    console.error('Failed to create profile:', error);
    return null;
  }
  return data;
}

interface SignInResult {
  error: Error | null;
  userId?: string;
  needsVerification?: boolean;
}

interface AuthContextType {
  user: any; 
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  debug: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const clerk = useClerk();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true); // default to true initially to prevent flash

  const refreshProfile = async () => {
    if (!clerkUser) { setProfile(null); return; }
    const profileData = await getProfile(clerkUser.id);
    setProfile(profileData);
  };

  const clerkUserId = clerkUser?.id;

  useEffect(() => {
    if (!clerkLoaded) return;
    
    if (clerkUser && clerkUserId) {
      setLoadingProfile(true);
      getProfile(clerkUserId).then(async (data) => {
        if (!data) {
          // Create profile if it doesn't exist
          const email = clerkUser.primaryEmailAddress?.emailAddress || '';
          const fullName = clerkUser.fullName || '';
          const newProfile = await createProfile(clerkUserId, email, fullName);
          setProfile(newProfile);
        } else {
          setProfile(data);
        }
      }).finally(() => {
        setLoadingProfile(false);
      });
    } else {
      setProfile(null);
      setLoadingProfile(false);
    }
  }, [clerkUserId, clerkLoaded]);

  const loading = !clerkLoaded || loadingProfile;

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      if (signIn) {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: `${window.location.origin}/auth/callback`,
          redirectUrlComplete: `${window.location.origin}/dashboard`,
        });
      }
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<SignInResult> => {
    if (!signInLoaded) return { error: new Error('Not loaded') };
    try {
      const res = await signIn.create({
        identifier: email,
        password,
      });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        const activeSession = clerk.client.sessions.find(s => s.id === res.createdSessionId);
        return { error: null, userId: activeSession?.user?.id };
      } else {
        return { error: new Error('Email not confirmed'), needsVerification: true };
      }
    } catch (err: any) {
      const code = err.errors?.[0]?.code;
      if (code === 'form_identifier_not_found' || code === 'form_password_incorrect') {
        return { error: new Error('Invalid email or password.') };
      }
      if (code === 'identifier_not_verified') {
        return { error: new Error('Email not confirmed'), needsVerification: true };
      }
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<SignInResult> => {
    if (!signUpLoaded) return { error: new Error('Not loaded') };
    try {
      const parts = fullName?.split(' ') || [];
      const res = await signUp.create({
        emailAddress: email,
        password,
        firstName: parts[0] || '',
        lastName: parts.slice(1).join(' ') || '',
      });
      
      await signUp.prepareEmailAddressVerification({ 
        strategy: "email_link",
        redirectUrl: `${window.location.origin}/auth/callback`
      });
      
      return { error: null, userId: res.createdUserId || undefined, needsVerification: true };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    if (!signUpLoaded) return { error: new Error('Not loaded') };
    try {
      await signUp.prepareEmailAddressVerification({ 
        strategy: "email_link",
        redirectUrl: `${window.location.origin}/auth/callback`
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await clerk.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user: clerkUser, profile, loading,
      signInWithEmail, signUpWithEmail,
      signInWithGoogle, resendVerificationEmail,
      signOut, refreshProfile,
      debug: { clerkLoaded, loadingProfile, hasClerkUser: !!clerkUser, clerkUserId }
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
