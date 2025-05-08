import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { createOffer, respondToOffer, checkNewOffers } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TestMatching() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [listingId, setListingId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');

  const logResult = (text: string) => {
    setResults(prev => [text, ...prev]);
  };

  const handleCreateOffer = async () => {
    if (!user || !listingId || !offerAmount) {
      logResult('Error: Missing required fields');
      return;
    }
    
    setLoading(true);
    try {
      const offerData = {
        listing_id: listingId,
        buyer_id: user.id,
        offer_price: parseFloat(offerAmount),
        message: message || 'I am interested in this item'
      };
      
      const result = await createOffer(offerData);
      logResult(`Offer created: ${JSON.stringify(result)}`);
      
      // Save the offer ID for later use
      if (result && result[0]?.id) {
        setOfferId(result[0].id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logResult(`Error creating offer: ${errorMessage}`);
      console.error('Error creating offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!offerId) {
      logResult('Error: No offer ID provided');
      return;
    }
    
    setLoading(true);
    try {
      const result = await respondToOffer(offerId, 'accept');
      logResult(`Offer accepted: ${JSON.stringify(result)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logResult(`Error accepting offer: ${errorMessage}`);
      console.error('Error accepting offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    if (!offerId) {
      logResult('Error: No offer ID provided');
      return;
    }
    
    setLoading(true);
    try {
      const result = await respondToOffer(offerId, 'decline');
      logResult(`Offer declined: ${JSON.stringify(result)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logResult(`Error declining offer: ${errorMessage}`);
      console.error('Error declining offer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOffers = async () => {
    if (!user) {
      logResult('Error: No user logged in');
      return;
    }
    
    setLoading(true);
    try {
      const result = await checkNewOffers(user.id);
      logResult(`Check offers result: ${JSON.stringify(result)}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logResult(`Error checking offers: ${errorMessage}`);
      console.error('Error checking offers:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Test Matching Feature',
          headerShown: true,
        }}
      />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Test Matching Functionality</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Listing ID:</Text>
            <TextInput
              style={styles.input}
              value={listingId}
              onChangeText={setListingId}
              placeholder="Enter listing ID"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Offer Amount:</Text>
            <TextInput
              style={styles.input}
              value={offerAmount}
              onChangeText={setOfferAmount}
              placeholder="Enter offer amount"
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message:</Text>
            <TextInput
              style={[styles.input, styles.messageInput]}
              value={message}
              onChangeText={setMessage}
              placeholder="Enter message (optional)"
              multiline
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Offer ID (for accept/decline):</Text>
            <TextInput
              style={styles.input}
              value={offerId}
              onChangeText={setOfferId}
              placeholder="Enter offer ID"
            />
          </View>
          
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.button}
              onPress={handleCreateOffer}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Create Offer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={handleAcceptOffer}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Accept Offer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={handleDeclineOffer}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Decline Offer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.checkButton]}
              onPress={handleCheckOffers}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Check New Offers</Text>
            </TouchableOpacity>
          </View>
          
          {loading && (
            <ActivityIndicator size="large" color="#6C5CE7" style={styles.loader} />
          )}
          
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Results:</Text>
            {results.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  checkButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
});
