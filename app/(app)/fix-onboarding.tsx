import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { addDebugLog } from '@/components/DebugOverlay';

export default function FixOnboardingStatus() {
  const { user, fetchCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Log current onboarding status
  const checkStatus = async () => {
    if (!user?.id) {
      setError('No authenticated user found');
      return;
    }

    try {
      setLoading(true);

      // Query current status
      const { data, error } = await supabase
        .from('users')
        .select('id, is_onboarded, is_seller, is_buyer')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[FIX] Error checking status:', error);
        addDebugLog('error', '[FIX] Error checking status', error);
        setError(error.message);
        return;
      }

      // Log the raw value
      console.log('[FIX] Current onboarding status:', {
        rawValue: data.is_onboarded,
        valueType: typeof data.is_onboarded
      });
      
      addDebugLog('info', '[FIX] Current onboarding status', {
        rawValue: data.is_onboarded,
        valueType: typeof data.is_onboarded
      });

      setResult(data);
    } catch (e) {
      console.error('[FIX] Exception checking status:', e);
      addDebugLog('error', '[FIX] Exception checking status', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Fix onboarding status
  const fixStatus = async () => {
    if (!user?.id) {
      setError('No authenticated user found');
      return;
    }

    try {
      setLoading(true);

      // Force update to boolean true
      const { data, error } = await supabase
        .from('users')
        .update({ is_onboarded: true })
        .eq('id', user.id)
        .select('id, is_onboarded')
        .single();

      if (error) {
        console.error('[FIX] Error updating status:', error);
        addDebugLog('error', '[FIX] Error updating status', error);
        setError(error.message);
        return;
      }

      console.log('[FIX] Status updated successfully:', data);
      addDebugLog('success', '[FIX] Status updated successfully', data);

      // Refresh user profile in auth context
      await fetchCurrentUser();

      setResult({
        ...data,
        fixed: true
      });
    } catch (e) {
      console.error('[FIX] Exception updating status:', e);
      addDebugLog('error', '[FIX] Exception updating status', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const navigateToMain = () => {
    router.replace('/(app)/nearby');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding Status Fix</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.button} onPress={checkStatus}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : result ? (
        <View style={styles.resultContainer}>
          {result.fixed ? (
            <>
              <Text style={styles.successText}>
                Onboarding status has been fixed!
              </Text>
              <Text style={styles.infoText}>
                Your is_onboarded flag is now set to true (boolean).
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.infoText}>
                Current is_onboarded value: {JSON.stringify(result.is_onboarded)}
              </Text>
              <Text style={styles.infoText}>
                Type: {typeof result.is_onboarded}
              </Text>
            </>
          )}

          <View style={styles.buttonContainer}>
            {!result.fixed && (
              <TouchableOpacity style={styles.button} onPress={fixStatus}>
                <Text style={styles.buttonText}>Fix Onboarding Status</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={navigateToMain}
            >
              <Text style={styles.buttonText}>
                {result.fixed ? 'Continue to App' : 'Skip and Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.infoText}>No data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    marginVertical: 20,
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 15,
    textAlign: 'center',
  },
  resultContainer: {
    marginVertical: 20,
  },
  successText: {
    color: '#28a745',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 8,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
