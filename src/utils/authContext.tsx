import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from './supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refreshUser = async () => {
    try {
      console.log('🔐 AUTH-CONTEXT: Refreshing user...');
      
      // Try client-side authentication first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 AUTH-CONTEXT: Session check:', { session: session?.user?.email || 'No session', error: sessionError });
      
      if (session?.user && !sessionError) {
        console.log('🔐 AUTH-CONTEXT: Found user from session:', session.user.email);
        setUser(session.user);
        setLoading(false);
        return;
      }
      
      // If no client-side session, try server-side check
      console.log('🔐 AUTH-CONTEXT: No client-side session, trying server-side check...');
      try {
        const response = await fetch('/api/get-user-first-name');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('🔐 AUTH-CONTEXT: Found user from server-side check:', data.user.email);
            // Create a User object from the server data
            const serverUser: User = {
              id: data.user.id,
              email: data.user.email,
              user_metadata: data.user.user_metadata,
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setUser(serverUser);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.log('🔐 AUTH-CONTEXT: Server-side check failed:', apiError);
      }
      
      // No user found
      console.log('🔐 AUTH-CONTEXT: No user found');
      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('🔐 AUTH-CONTEXT: Error refreshing user:', error);
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔐 AUTH-CONTEXT: Initializing auth context...');
    
    // Initial user check
    refreshUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 AUTH-CONTEXT: Auth state changed:', event, session?.user?.email || 'No user');
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}; 