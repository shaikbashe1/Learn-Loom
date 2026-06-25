import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';
import { logUserActivity } from '@/lib/activity';

export async function getProfile(userId?: string): Promise<Profile | null> {
  let query = supabase.from('profiles').select('*');
  if (userId) {
    query = query.eq('id', userId);
  }
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Failed to fetch profile:', error);
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
  user: User | null; 
  profile: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<SignInResult>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<SignInResult>;
  verifyEmailCode: (email: string, code: string) => Promise<SignInResult>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithGitHub: () => Promise<{ error: Error | null }>;
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

  // Keep refs up-to-date to avoid stale closures inside supabase auth state listener
  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Strict RBAC Override: Enforce super_admin ONLY for the authorized email
  const applyRoleOverride = (u: User | null, p: Profile | null): Profile | null => {
    if (!p) return null;
    if (u?.email === 'shaikbashe2222@gmail.com') {
      return { ...p, role: 'super_admin' };
    }
    // Downgrade any unauthorized super_admins to normal users
    if (p.role === 'super_admin' || p.role === 'admin') {
      return { ...p, role: 'user' };
    }
    return p;
  };

  useEffect(() => {
    // Initial session fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(data => {
          setProfile(applyRoleOverride(session.user, data));
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = userRef.current;
      const currentProfile = profileRef.current;

      setUser(session?.user ?? null);
      if (session?.user) {
        if (event === 'SIGNED_IN') {
          void logUserActivity(session.user.id, 'login');
        }

        // Only block UI and trigger loading if user ID changed or profile isn't loaded
        const isSameUser = currentUser && currentUser.id === session.user.id;
        const hasProfile = !!currentProfile;
        const shouldShowLoading = !isSameUser || !hasProfile;

        if (shouldShowLoading) {
          setLoading(true);
        }

        getProfile(session.user.id).then(data => {
          setProfile(applyRoleOverride(session.user, data));
          if (shouldShowLoading) {
            setLoading(false);
          }
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(applyRoleOverride(user, profileData));
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithGitHub = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          return { error: new Error('Email not confirmed'), needsVerification: true };
        }
        return { error: new Error('Invalid email or password.') };
      }
      
      return { error: null, userId: data.user?.id };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      
      if (error) return { error };
      
      return { error: null, userId: data.user?.id, needsVerification: true };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const verifyEmailCode = async (email: string, code: string): Promise<SignInResult> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) return { error };
      return { error: null, userId: data.user?.id };
    } catch (err: any) {
      return { error: err as Error };
    }
  };

  const resendVerificationEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithEmail, signUpWithEmail, verifyEmailCode,
      signInWithGoogle, signInWithGitHub, resendVerificationEmail,
      signOut, refreshProfile,
      debug: { loadingProfile: loading, hasUser: !!user, userId: user?.id }
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
