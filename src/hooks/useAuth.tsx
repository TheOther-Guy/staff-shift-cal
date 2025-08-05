import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'company_manager' | 'location_manager' | 'brand_manager' | 'store_manager';
  company_id: string | null;
  brand_id: string | null;
  store_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile
          setTimeout(async () => {
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
            
            if (!profileData && !error) {
              // Check if there's a pending approval request for this email
              const { data: pendingRequest } = await supabase
                .from('approval_requests')
                .select('*')
                .eq('type', 'profile_creation')
                .eq('status', 'pending')
                .or(`request_data->>'email'.eq.${session.user.email}`)
                .maybeSingle();

              // Don't create profile automatically - all new users must go through approval
              console.log('User has no profile and needs approval');
              setProfile(null);
            } else {
              setProfile(profileData);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile
        setTimeout(async () => {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          if (!profileData && !error) {
            // Check if there's a pending approval request for this email
            const { data: pendingRequest } = await supabase
              .from('approval_requests')
              .select('*')
              .eq('type', 'profile_creation')
              .eq('status', 'pending')
              .or(`request_data->>'email'.eq.${session.user.email}`)
              .maybeSingle();

            // Don't create profile automatically - all new users must go through approval
            console.log('User has no profile and needs approval');
            setProfile(null);
          } else {
            setProfile(profileData);
          }
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Create approval request instead of direct signup
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password,
          full_name: fullName,
          role: 'store_manager', // Default role
          request_approval: true // Flag to create approval request instead of direct user
        }
      });

      if (functionError) {
        return { error: functionError };
      }

      return { error: null, data: { needsApproval: true } };
    } catch (error: any) {
      return { error: { message: error.message || 'Signup failed' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    // Redirect to home page after sign out
    window.location.href = '/';
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
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