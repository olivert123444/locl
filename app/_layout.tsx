import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { NotificationProvider } from '@/context/NotificationContext';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Root layout wrapper with auth provider
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <NotificationProvider>
          <RootLayoutNav />
          <StatusBar style="auto" />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Navigation component that handles auth state
function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [isOnboarded, setIsOnboarded] = useState<boolean | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsOnboarded(null);
        setIsInitialized(true);
        return;
      }

      setCheckingProfile(true);
      try {
        console.log('Checking onboarding status for user:', user.id);
        
        // Check if user has a record in the users table with location set
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user record:', error);
          
          // If no user record found, create a basic one
          if (error.code === 'PGRST116') {
            console.log('No user record found, creating a basic user record');
            
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
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
              
            if (createError) {
              console.error('Error creating user record:', createError);
              setIsOnboarded(false);
            } else {
              setIsOnboarded(false); // Still need to complete onboarding
            }
          } else {
            throw error;
          }
        } else {
          // User record exists, check if onboarding is complete
          // Check if location data exists and has required fields
          const hasLocation = !!data.location && 
                             typeof data.location === 'object' && 
                             !!data.location.city && 
                             !!data.location.zip_code;
          const hasProfile = !!data.full_name;
          
          console.log('User record check:', { 
            hasLocation, 
            hasProfile, 
            location: data.location, 
            name: data.full_name 
          });
          
          setIsOnboarded(hasLocation && hasProfile);
        }
      } catch (error) {
        console.error('Error in onboarding check:', error);
        setIsOnboarded(false);
      } finally {
        setCheckingProfile(false);
        setIsInitialized(true);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isInitialized || loading || checkingProfile) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    console.log('Navigation check:', { 
      user: !!user, 
      isOnboarded, 
      inAuthGroup, 
      inOnboardingGroup,
      segments: segments[0] 
    });

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      console.log('Redirecting to login');
      router.replace('/(auth)/login');
    } else if (user && isOnboarded === false && !inOnboardingGroup) {
      // Redirect to onboarding if not completed
      console.log('Redirecting to onboarding');
      router.replace('/(onboarding)');
    } else if (user && isOnboarded === true && (inAuthGroup || inOnboardingGroup)) {
      // Redirect to home if authenticated and onboarded
      console.log('Redirecting to home');
      router.replace('/');
    }
  }, [user, isOnboarded, segments, loading, isInitialized, checkingProfile]);

  // Show loading indicator while initializing
  if (loading || !isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Render the current route
  return <Slot />;
}
