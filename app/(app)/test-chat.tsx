import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { checkNewOffers, respondToOffer } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestChat() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCheckOffers = async () => {
    if (!user) return;
    
    try {
      const result = await checkNewOffers(user.id);
      alert(`Offers: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('Error checking offers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleTestChat = () => {
    router.push({
      pathname: '/(app)/chat/[id]',
      params: { 
        id: '1',
        otherUserId: 'test-user',
        otherUserName: 'Test User',
        listingId: '1',
        listingTitle: 'Test Listing'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Test Chat Functionality',
          headerShown: true,
        }}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Test Chat Functionality</Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleCheckOffers}
        >
          <Text style={styles.buttonText}>Check for New Offers</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleTestChat}
        >
          <Text style={styles.buttonText}>Test Chat Navigation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(app)/messages')}
        >
          <Text style={styles.buttonText}>Go to Messages</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
