import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function TestScreen() {
  const router = useRouter();
  const { testConnection } = useAuth();
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runTest = async () => {
      try {
        const result = await testConnection();
        if (result) {
          setStatus('All tests passed successfully!');
        } else {
          setStatus('Tests failed');
        }
      } catch (err: any) {
        setError(err.message);
        setStatus('Error occurred');
      }
    };

    runTest();
  }, [testConnection]);

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Supabase Test</Text>
      <Text style={{ fontSize: 16, marginBottom: 10 }}>Status: {status}</Text>
      {error && <Text style={{ color: 'red', marginBottom: 20 }}>{error}</Text>}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/login')}
        style={{
          padding: 10,
          paddingHorizontal: 20,
          backgroundColor: '#007AFF',
          borderRadius: 5,
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Login</Text>
      </TouchableOpacity>
    </View>
  );
}
