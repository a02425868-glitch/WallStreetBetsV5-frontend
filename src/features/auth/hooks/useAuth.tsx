"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOnline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // Set up auth state listener with timeout
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (isMounted) {
              setSession(session);
              setUser(session?.user ?? null);
              setLoading(false);
            }
          }
        );

        // Get existing session with timeout
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('Supabase auth check timed out - continuing without session');
            setLoading(false);
            setIsOnline(false);
          }
        }, 5000); // 5 second timeout

        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          clearTimeout(timeoutId);
          
          if (!error && isMounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setIsOnline(true);
          } else if (error && isMounted) {
            console.warn('Could not fetch session:', error.message);
            setIsOnline(false);
          }
        } catch (err) {
          clearTimeout(timeoutId);
          if (isMounted) {
            console.warn('Network error during auth check:', err);
            setIsOnline(false);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }

        return () => subscription.unsubscribe();
      } catch (err) {
        if (isMounted) {
          console.error('Auth initialization error:', err);
          setLoading(false);
          setIsOnline(false);
        }
      }
    };

    // Monitor network connectivity
    const handleOnline = () => {
      if (isMounted) {
        setIsOnline(true);
      }
    };

    const handleOffline = () => {
      if (isMounted) {
        setIsOnline(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    initAuth();

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (err) {
      console.error('Sign in error:', err);
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      console.error('Sign up error:', err);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isOnline, signIn, signUp, signOut }}>
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
