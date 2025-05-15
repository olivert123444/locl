import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCurrentLocation } from '@/lib/locationService';

export default function OnboardingStart() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  // Add a ref to track if we're already in the process of redirecting
  const isRedirectingRef = useRef(false);
  
  // Track if this component is mounted
  const isMountedRef = useRef(true);
  
  // Track if user is onboarded
  const [isOnboarded, setIsOnboarded] = useState(false);
  
  // Check if user is already onboarded when component mounts
  useEffect(() => {
    if (!user) return;
    
    console.log('Onboarding index mounted, checking onboarding status...');
    isMountedRef.current = true;
    
    // First check if user is already onboarded
    checkOnboardingStatus();
    
    // Cleanup timeout on unmount
    return () => {
      isMountedRef.current = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [user]);
  
  // Add an effect to detect navigation and prevent unnecessary redirects
  useEffect(() => {
    // Set a flag when we're about to navigate away
    const handleBeforeNavigate = () => {
      console.log('Navigation in progress, setting isRedirecting flag');
      isRedirectingRef.current = true;
      
      // Reset the flag after a delay to allow for future navigations
      setTimeout(() => {
        if (isMountedRef.current) {
          isRedirectingRef.current = false;
        }
      }, 5000);
    };
    
    // In Expo Router, we can detect navigation by watching for changes
    // and setting our flag before the navigation completes
    const originalReplace = router.replace;
    router.replace = function(...args: Parameters<typeof router.replace>) {
      handleBeforeNavigate();
      return originalReplace.apply(this, args);
    };
    
    const originalPush = router.push;
    router.push = function(...args: Parameters<typeof router.push>) {
      handleBeforeNavigate();
      return originalPush.apply(this, args);
    };
    
    return () => {
      // Restore original methods
      router.replace = originalReplace;
      router.push = originalPush;
    };
  }, [router]);
  
  // Function to check if user is already onboarded
  const checkOnboardingStatus = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    // Set a timeout to show an error if the check takes too long
    const timeout = setTimeout(() => {
      setError('Checking onboarding status is taking longer than expected. Please try again.');
      setIsLoading(false);
    }, 10000); // 10 seconds timeout
    
    setTimeoutId(timeout);
    
    try {
      // Check if user is already onboarded
      const { data, error } = await supabase
        .from('users')
        .select('is_onboarded')
        .eq('id', user.id)
        .single();
      
      // Clear the timeout since we got a response
      clearTimeout(timeout);
      setTimeoutId(null);
      
      if (error) {
        console.error('Error checking onboarding status:', error);
        // Continue with location check as fallback
        checkLocationPermissions();
        return;
      }
      
      if (data && (data.is_onboarded === true || data.is_onboarded === 'true')) {
        setIsOnboarded(true);
        
        // Check if we're already at the main app or in the process of redirecting
        // Use the current pathname to determine if we're at the main app
        // This is compatible with Expo Router
        const pathname = (window as any).location?.pathname || '';
        const isAtMainApp = pathname === '/' || pathname.startsWith('/(tabs)');
        
        if (isAtMainApp) {
          console.log('User is already onboarded and at main app, no redirect needed');
          return;
        }
        
        // Only redirect if we're not already in the process of redirecting
        if (!isRedirectingRef.current) {
          console.log('User is already onboarded, redirecting to home');
          isRedirectingRef.current = true;
          
          // Set a timeout to reset the redirecting flag in case navigation fails
          setTimeout(() => {
            isRedirectingRef.current = false;
          }, 5000);
          
          // Reset loading state before navigation
          setIsLoading(false);
          setCheckingLocation(false);
          
          // Force a slight delay before redirecting to ensure state is stable
          setTimeout(() => {
            if (isMountedRef.current && !isAtMainApp) {
              console.log('Executing navigation to home...');
              // Use a double navigation to break the stack
              router.replace('/');
              setTimeout(() => {
                if (isMountedRef.current) {
                  router.push('/');
                }
              }, 100);
            }
          }, 100);
          return;
        } else {
          console.log('Already redirecting, skipping redundant redirect to home');
          return;
        }
      }
      
      // User exists but is not onboarded, proceed with location check
      console.log('User is not onboarded, checking location permissions...');
      checkLocationPermissions();
    } catch (error) {
      console.error('Error in onboarding status check:', error);
      clearTimeout(timeout);
      setTimeoutId(null);
      setError('Failed to check onboarding status. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Function to check if location permissions are granted and request them if needed
  const checkLocationPermissions = async () => {
    if (!user) return;
    
    setCheckingLocation(true);
    setIsLoading(true);
    setError(null);
    
    // Set a timeout for the location permission request
    const timeout = setTimeout(() => {
      setError('Getting your location is taking longer than expected. Please check your GPS settings and try again.');
      setIsLoading(false);
      setCheckingLocation(false);
    }, 10000); // 10 seconds timeout
    
    setTimeoutId(timeout);
    
    try {
      // Check if location permissions are already granted
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status === 'granted') {
        console.log('Location permissions already granted, attempting to auto-save location');
        clearTimeout(timeout);
        setTimeoutId(null);
        await autoSaveLocationAndProceed();
      } else {
        console.log('Location permissions not granted yet, requesting permissions...');
        
        // Actively request location permissions
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        
        clearTimeout(timeout);
        setTimeoutId(null);
        
        if (newStatus === 'granted') {
          console.log('Location permissions granted, proceeding with location save');
          await autoSaveLocationAndProceed();
        } else {
          console.log('Location permission denied by user');
          setError('Location permission is required to use this app. Please enable location services and try again.');
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('Error checking or requesting location permissions:', error);
      clearTimeout(timeout);
      setTimeoutId(null);
      setError('Failed to access location services. Please check your device settings and try again.');
      setIsLoading(false);
    } finally {
      setCheckingLocation(false);
    }
  };
  
  // Function to automatically save location and proceed to profile page
  const autoSaveLocationAndProceed = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    // Set a timeout to show an error if the location save takes too long
    const timeout = setTimeout(() => {
      setError('Saving location is taking longer than expected. Please check your GPS settings and try again.');
      setIsLoading(false);
    }, 10000); // 10 seconds timeout
    
    setTimeoutId(timeout);
    
    try {
      // Get current location data - force fresh data (no cache)
      const locationData = await getCurrentLocation(false);
      
      // Clear the timeout since we got a response
      clearTimeout(timeout);
      setTimeoutId(null);
      
      // Check if we have valid location data (coordinates are enough)
      if (locationData && locationData.latitude && locationData.longitude) {
        console.log('Got valid location data, saving to user profile');
        
        // Format location data for storage
        const formattedLocation = {
          // Use city from geocoding or coordinates-based placeholder
          city: locationData.city || `Location (${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)})`,
          // Use zip code if available, but it's optional
          zip_code: locationData.postalCode || locationData.zip_code || '',
          country: locationData.country || 'Unknown',
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: locationData.address || ''
        };
        
        console.log('Saving location data:', formattedLocation);
        
        // Check if user exists in the users table and get ALL existing data
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        let result;

        if (!existingUser && (!fetchError || fetchError.code === 'PGRST116')) {
          // User doesn't exist yet, create a new user record
          console.log('Creating new user record with location data');
          result = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: '',
              location: formattedLocation,
              is_seller: false,
              is_buyer: true,
              // Set is_onboarded to false until profile is completed
              is_onboarded: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        } else {
          // User exists, update ONLY the location while preserving all other fields
          console.log('Updating existing user record with location data');
          
          // Log the existing user data to verify what fields we have
          console.log('Existing user data before update:', existingUser);
          
          // Only update the location and timestamp, preserving all other fields
          const updateData = {
            location: formattedLocation,
            updated_at: new Date().toISOString(),
          };
          
          console.log('Updating only location data:', updateData);
          
          result = await supabase
            .from('users')
            .update(updateData)
            .eq('id', user.id);
        }
        
        if (result.error) {
          console.error('Error saving location data:', result.error);
          throw new Error(`Database error: ${result.error.message}`);
        }
        
        // Skip location page and go directly to profile setup
        console.log('Location saved successfully, proceeding to profile setup');
        router.push('/(onboarding)/profile');
        return;
      } else {
        // No valid coordinates - show error and let user retry
        console.log('No valid location data available');
        setError('Could not get your location. Please check your GPS settings and try again.');
      }
    } catch (error) {
      console.error('Error in auto-save location:', error);
      // Clear the timeout if there was an error
      if (timeoutId) {
        clearTimeout(timeout);
        setTimeoutId(null);
      }
      setError('Failed to save location. Please check your GPS settings and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = async () => {
    setIsLoading(true);
    setError(null);
    
    // Set a timeout for the location check
    const timeout = setTimeout(() => {
      setError('Getting your location is taking longer than expected. Please check your GPS settings and try again.');
      setIsLoading(false);
    }, 10000); // 10 seconds timeout
    
    setTimeoutId(timeout);
    
    try {
      // Request location permissions if not already granted
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Requesting location permissions...');
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        
        if (newStatus !== 'granted') {
          clearTimeout(timeout);
          setTimeoutId(null);
          setError('Location permission is required to use this app. Please enable location services and try again.');
          setIsLoading(false);
          return;
        }
      }
      
      // Get current location data
      const locationData = await getCurrentLocation(false);
      
      if (!locationData || !locationData.latitude || !locationData.longitude) {
        clearTimeout(timeout);
        setTimeoutId(null);
        setError('Could not get your location. Please check your GPS settings and try again.');
        setIsLoading(false);
        return;
      }
      
      // Save location data and proceed to profile setup
      await autoSaveLocationAndProceed();
      
      clearTimeout(timeout);
      setTimeoutId(null);
    } catch (error) {
      console.error('Error in handleGetStarted:', error);
      clearTimeout(timeout);
      setTimeoutId(null);
      setError('Failed to get your location. Please try again.');
      setIsLoading(false);
    }
  };


  
  // Early return if user is already onboarded to prevent rendering and re-mounting
  if (isOnboarded) {
    console.log('User is onboarded, preventing render of onboarding component');
    return null;
  }
  
  return (
    <View style={styles.container}>
      {(isLoading || checkingLocation) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Setting up your account...</Text>
          {error && (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setError(null);
                  checkOnboardingStatus();
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Welcome to Locl</Text>
          <Text style={styles.subtitle}>
            Find and connect with local sellers and buyers in your area.
          </Text>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleGetStarted}
            disabled={isLoading || checkingLocation}
          >
            {isLoading || checkingLocation ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#555',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#777',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    marginTop: 20,
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
