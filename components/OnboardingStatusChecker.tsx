import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase';
import { addDebugLog } from './DebugOverlay';

const USER_ID = '4d4f89d5-f566-491c-8197-ad4566d10d98'; // The user ID from your logs

export default function OnboardingStatusChecker() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkOnboardingStatus = async () => {
    try {
      setLoading(true);
      
      // Query the database for the specific user
      const { data, error } = await supabase
        .from('users')
        .select('id, is_onboarded, is_seller, is_buyer')
        .eq('id', USER_ID)
        .single();
      
      if (error) {
        console.error('[STATUS_CHECK] ❌ Error fetching user data:', error);
        addDebugLog('error', '[STATUS_CHECK] Error fetching user data', error);
        setError(error.message);
        return;
      }
      
      if (!data) {
        console.warn('[STATUS_CHECK] ⚠️ No user data found');
        addDebugLog('warn', '[STATUS_CHECK] No user data found');
        setError('No user data found');
        return;
      }
      
      // Log the raw data and all possible boolean conversions
      const diagnosticData = {
        rawValue: data.is_onboarded,
        valueType: typeof data.is_onboarded,
        strictEqualityCheck: data.is_onboarded === true,
        looseEqualityCheck: data.is_onboarded == true,
        doubleNegation: !!data.is_onboarded,
        booleanCast: Boolean(data.is_onboarded),
        parseBoolean: data.is_onboarded === 'true' || data.is_onboarded === true || data.is_onboarded === 1,
        numericValue: data.is_onboarded === 1 || data.is_onboarded === '1'
      };
      
      console.log('[STATUS_CHECK] ✅ User data fetched successfully:', { 
        userId: data.id,
        ...diagnosticData
      });
      
      addDebugLog('success', '[STATUS_CHECK] User data fetched', { 
        userId: data.id,
        ...diagnosticData
      });
      
      setResult({
        userData: data,
        diagnostics: diagnosticData
      });
    } catch (e) {
      console.error('[STATUS_CHECK] ❌ Exception in status check:', e);
      addDebugLog('error', '[STATUS_CHECK] Exception in status check', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const forceUpdate = async () => {
    try {
      setLoading(true);
      
      // Force update the is_onboarded flag to true
      const { data, error } = await supabase
        .from('users')
        .update({ is_onboarded: true })
        .eq('id', USER_ID)
        .select('id, is_onboarded')
        .single();
      
      if (error) {
        console.error('[STATUS_CHECK] ❌ Error updating user data:', error);
        addDebugLog('error', '[STATUS_CHECK] Error updating user data', error);
        setError(error.message);
        return;
      }
      
      console.log('[STATUS_CHECK] ✅ User onboarding status updated:', data);
      addDebugLog('success', '[STATUS_CHECK] User onboarding status updated', data);
      
      // Refresh the data
      checkOnboardingStatus();
    } catch (e) {
      console.error('[STATUS_CHECK] ❌ Exception during update:', e);
      addDebugLog('error', '[STATUS_CHECK] Exception during update', e);
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding Status Checker</Text>
      
      {loading ? (
        <Text>Loading...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : result ? (
        <ScrollView style={styles.resultContainer}>
          <Text style={styles.subtitle}>Raw User Data:</Text>
          <Text style={styles.code}>
            {JSON.stringify(result.userData, null, 2)}
          </Text>
          
          <Text style={styles.subtitle}>Diagnostic Checks:</Text>
          <Text style={styles.code}>
            {JSON.stringify(result.diagnostics, null, 2)}
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={checkOnboardingStatus}>
            <Text style={styles.buttonText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={forceUpdate}>
            <Text style={styles.buttonText}>Force Update to TRUE</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <Text>No data available</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  resultContainer: {
    maxHeight: 400,
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: '#f1f3f5',
    padding: 12,
    borderRadius: 4,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
