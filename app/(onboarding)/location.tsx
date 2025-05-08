import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LocationSetup() {
  const router = useRouter();
  const { user } = useAuth();
  const [location, setLocation] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setIsLoading(false);
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        // Get location name from coordinates
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          // Find postal code
          const addressComponents = data.results[0].address_components;
          const postalCode = addressComponents.find(
            (component: { types: string[]; long_name: string }) => component.types.includes('postal_code')
          );
          
          if (postalCode) {
            setZipCode(postalCode.long_name);
          }
          
          // Set location name (city or neighborhood)
          const locality = addressComponents.find(
            (component: { types: string[]; long_name: string }) => component.types.includes('locality')
          );
          
          if (locality) {
            setLocation(locality.long_name);
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not determine your location');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleContinue = async () => {
    if (!location || !zipCode) {
      setErrorMsg('Please enter your location and zip code');
      return;
    }

    setIsLoading(true);
    try {
      if (!user) {
        console.error('No authenticated user found');
        setErrorMsg('You must be logged in to continue');
        return;
      }

      console.log('Attempting to save location for user:', user.id);
      console.log('Location data:', { location, zipCode });

      // Format location as JSONB for the users table
      const locationData = {
        city: location,
        zip_code: zipCode,
        country: 'US' // Default country
      };

      // Check if user exists in the users table
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      console.log('User check result:', { existingUser, fetchError });

      let result;

      if (!existingUser && (!fetchError || fetchError.code === 'PGRST116')) {
        // User doesn't exist yet, create a new user record
        console.log('Creating new user record');
        result = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: '',
            location: locationData,
            is_seller: false,
            is_buyer: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      } else {
        // User exists, update the location
        console.log('Updating existing user record');
        result = await supabase
          .from('users')
          .update({
            location: locationData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }

      console.log('Database operation result:', result);

      if (result.error) {
        console.error('Database error:', result.error);
        throw new Error(`Database error: ${result.error.message}`);
      }

      console.log('Location saved successfully');
      
      // Navigate to the next onboarding step
      router.push('/(onboarding)/profile');
    } catch (error: any) {
      console.error('Error saving location:', error);
      // Provide more specific error message to help with debugging
      setErrorMsg(`Failed to save your location: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Your Location</Text>
        <Text style={styles.subtitle}>
          We'll use your location to show you items nearby and help you connect with local buyers and sellers.
        </Text>

        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>City/Neighborhood</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your city or neighborhood"
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Zip Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your zip code"
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
          </>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.button, (isLoading || (!location && !zipCode)) && styles.buttonDisabled]} 
        onPress={handleContinue}
        disabled={isLoading || (!location && !zipCode)}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#555',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loader: {
    marginVertical: 30,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
