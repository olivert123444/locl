import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { createOffer } from '@/lib/supabase';

export default function CreateTestOfferScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [listingId, setListingId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateOffer = async () => {
    if (!listingId || !buyerId || !offerPrice) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      // Create the offer data
      const offerData = {
        listing_id: listingId,
        buyer_id: buyerId,
        offer_price: parseFloat(offerPrice),
        status: 'pending'
      };

      // Call the createOffer function from supabase.ts
      const result = await createOffer(offerData);
      
      Alert.alert(
        'Success', 
        'Test offer created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating test offer:', error);
      Alert.alert('Error', 'Failed to create test offer. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Test Offer</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Listing ID:</Text>
        <TextInput
          style={styles.input}
          value={listingId}
          onChangeText={setListingId}
          placeholder="Enter listing ID"
        />

        <Text style={styles.label}>Buyer ID:</Text>
        <TextInput
          style={styles.input}
          value={buyerId}
          onChangeText={setBuyerId}
          placeholder="Enter buyer ID"
        />

        <Text style={styles.label}>Offer Price:</Text>
        <TextInput
          style={styles.input}
          value={offerPrice}
          onChangeText={setOfferPrice}
          placeholder="Enter offer price"
          keyboardType="numeric"
        />

        <TouchableOpacity 
          style={styles.createButton}
          onPress={handleCreateOffer}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Test Offer</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
