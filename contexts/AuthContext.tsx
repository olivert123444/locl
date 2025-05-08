import React, { createContext, useContext, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with the correct URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzkixvdhdvhhwamglszu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a2l4dmRoZHZoaHdhbWdsc3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MjcyNzMsImV4cCI6MjA2MjIwMzI3M30.9JdSvPfUmG7k90b6jFQffLh1NqBJpRGFhTdMV-PAdgw';

// Log the URL being used to help with debugging
console.log('Using Supabase URL in AuthContext:', supabaseUrl);

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

console.log('Supabase initialized with auth options');

import { User as SupabaseUser } from '@supabase/supabase-js';

interface User extends SupabaseUser {}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  testConnection: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    setLoading(false);
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting login with email:', email);
      
      // Attempt to sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and confirm your account before logging in.');
        } else {
          throw new Error(error.message || 'Login failed');
        }
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed. Please try again.');
      }

      console.log('Login successful:', data.user.id);
      
      // After successful login, check if user has a profile in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (userError && userError.code !== 'PGRST116') {
        // Log the error but don't throw - user is still logged in
        console.error('Error fetching user profile:', userError);
      }
      
      // If no user record exists, we'll create a basic one
      if (!userData && userError && userError.code === 'PGRST116') {
        console.log('No user record found, creating a basic user profile');
        
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: '',
            is_seller: false,
            is_buyer: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: {
              city: '',
              zip_code: '',
              country: 'US'
            }
          });
          
        if (createUserError) {
          console.error('Error creating user record:', createUserError);
          // Don't throw error, user is still logged in
        }
      }
      
      // Update the user state
      setUser(data.user);
    } catch (error: any) {
      console.error('Error signing in:', error.message);
      throw new Error(error.message || 'Login failed');
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      console.log('Attempting signup with email:', email);
      
      // First check if the email is already registered
      const { data: existingUser, error: existingUserError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });
      
      if (existingUserError && !existingUserError.message.includes('Email not confirmed')) {
        // If there's an error that's not about email confirmation, it's likely a new user
        console.log('Email appears to be available for registration');
      } else if (existingUser) {
        console.error('Email already registered');
        throw new Error('Email already registered. Please log in or use a different email.');
      }
      
      // Proceed with signup
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://locl-marketplace.com', // This should be your app's URL
          data: {
            created_at: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw new Error(error.message || 'Signup failed');
      }

      console.log('Signup response:', data);
      
      // Check if user was created successfully
      if (!data?.user) {
        throw new Error('Failed to create user account');
      }
      
      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error('Email already registered. Please log in.');
      }
      
      // If no session was created, email confirmation is required
      if (!data.session) {
        console.log('Email confirmation required. Check your email for the confirmation link.');
        return; // Return without error as this is expected behavior
      }
      
      // If we got here with a session, the user was auto-confirmed
      console.log('User created and auto-confirmed:', data.user);
      setUser(data.user);
      
    } catch (error: any) {
      console.error('Error signing up:', error.message);
      throw new Error(error.message || 'Signup failed');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  // Test function to verify Supabase connection
  const testConnection = async () => {
    try {
      // Test auth
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;

      // Test database
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (dbError) throw dbError;

      console.log('Test successful:', {
        auth: session?.user,
        user: users[0]
      });

      return true;
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        testConnection,
      }}
    >
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
