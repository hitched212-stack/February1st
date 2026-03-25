import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { useQueryClient } from '@tanstack/react-query';
import { useAIChatStore } from '@/store/aiChatStore';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef<string | null>(null);
  
  // Get query client for cache invalidation
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    queryClient = useQueryClient();
  } catch {
    // QueryClient not available yet, that's okay
  }

  useEffect(() => {
    let sessionRefreshTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // Get existing session from localStorage (instant — no network call)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // ── Fast path ──────────────────────────────────────────────────────
          // Set user immediately so the app renders and trade fetching starts
          // right away.  The Supabase SDK auto-refreshes expired access tokens
          // transparently when API calls are made, so we don't need to wait for
          // a manual refreshSession() before showing the app.
          previousUserIdRef.current = session.user?.id || null;
          setSession(session);
          setUser(session.user ?? null);
          setLoading(false); // ← unblock the UI immediately

          // Refresh the token in the background so it stays valid.
          // Don't await — this must not delay app startup.
          supabase.auth.refreshSession()
            .then(({ data: { session: refreshedSession }, error: refreshError }) => {
              if (refreshError || !refreshedSession) {
                // Refresh token is expired/invalid — sign the user out quietly
                console.debug('Background session refresh failed, clearing session');
                setSession(null);
                setUser(null);
                previousUserIdRef.current = null;
                useDataStore.getState().resetAll();
              }
              // Success is handled by onAuthStateChange('TOKEN_REFRESHED') below
            })
            .catch(() => {
              // Network error — keep the current session; the SDK will retry
              // automatically on the next API call.
              console.debug('Background session refresh network error, keeping session');
            });

          return; // already called setLoading(false) above
        }
      } catch (error) {
        console.debug('Failed to initialize session:', error);
      }
      setLoading(false);
    };

    // Initialize session immediately
    initializeAuth();

    // Set up auth state listener for real-time changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id || null;
        const previousUserId = previousUserIdRef.current;
        
        // Detect user change (sign in as different user, or sign in after sign out)
        const isNewUser = newUserId && newUserId !== previousUserId;
        const isSignOut = event === 'SIGNED_OUT';
        
        // Reset all cached data when user changes or signs out
        if (isNewUser || isSignOut) {
          // Reset the global data store synchronously BEFORE updating auth state
          useDataStore.getState().resetAll();
          
          // Invalidate React Query cache if available
          if (queryClient) {
            queryClient.clear();
          }
        }
        
        // Update the previous user ID reference
        previousUserIdRef.current = newUserId;
        
        // Now update auth state - this will trigger re-renders with clean data
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Periodically refresh session to keep it alive (every 50 minutes)
    // This prevents token expiration during active app use
    sessionRefreshTimeout = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase.auth.refreshSession();
        }
      } catch (error) {
        console.debug('Periodic session refresh failed:', error);
      }
    }, 50 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionRefreshTimeout);
    };
  }, [queryClient]);

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username || email.split('@')[0]
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Pre-emptively reset data store BEFORE signing in to ensure clean state
    useDataStore.getState().resetAll();
    if (queryClient) {
      queryClient.clear();
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Clear all local state FIRST
    setSession(null);
    setUser(null);
    previousUserIdRef.current = null;

    // Reset the global data store
    useDataStore.getState().resetAll();
    
    // Reset AI chat store
    useAIChatStore.getState().resetOnLogout();
    
    
    // Clear React Query cache
    if (queryClient) {
      queryClient.clear();
    }
    
    // Sign out from Supabase
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Session may already be invalid, that's okay
    }
    
    // Force hard redirect to auth page to break out of SPA routing
    window.location.replace('/auth');
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
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
