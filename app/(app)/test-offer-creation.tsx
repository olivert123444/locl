import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// import { useAuth } from '@/contexts/AuthContext';
import { supabase, createOffer } from '@/lib/supabase';

interface Listing {
  id: string;
  title: string;
  price: number;
  seller_id: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export default function TestOfferCreationScreen() {
  const router = useRouter();
  // Using a mock user ID for testing purposes
  const mockUserId = '00000000-0000-0000-0000-000000000000';
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedBuyer, setSelectedBuyer] = useState<User | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  
  // Fetch listings and users for testing
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch listings
        const { data: listingsData, error: listingsError } = await supabase
          .from('listings')
          .select('id, title, price, seller_id')
          .eq('status', 'active')
          .limit(10);
          
        if (listingsError) {
          console.error('Error fetching listings:', listingsError);
        } else {
          setListings(listingsData || []);
        }
        
        // Fetch users
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .limit(10);
          
        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          setUsers(usersData || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Handle creating a test offer
  const handleCreateOffer = async () => {
    if (!selectedListing || !selectedBuyer || !offerPrice) {
      Alert.alert('Error', 'Please select a listing, buyer, and enter an offer price');
      return;
    }
    
    setIsCreatingOffer(true);
    try {
      const offerData = {
        listing_id: selectedListing.id,
        buyer_id: selectedBuyer.id,
        offer_price: parseFloat(offerPrice),
        status: 'pending'
      };
      
      console.log('Creating offer with data:', offerData);
      const result = await createOffer(offerData);
      
      Alert.alert(
        'Success', 
        'Test offer created successfully!',
        [{ text: 'OK' }]
      );
      
      // Reset form
      setSelectedListing(null);
      setSelectedBuyer(null);
      setOfferPrice('');
    } catch (error) {
      console.error('Error creating test offer:', error);
      Alert.alert('Error', `Failed to create test offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingOffer(false);
    }
  };
  
  // Render listing item
  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={[
        styles.itemCard, 
        selectedListing?.id === item.id && styles.selectedCard
      ]}
      onPress={() => setSelectedListing(item)}
    >
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemPrice}>${item.price}</Text>
      <Text style={styles.itemId}>ID: {item.id}</Text>
    </TouchableOpacity>
  );
  
  // Render user item
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={[
        styles.itemCard, 
        selectedBuyer?.id === item.id && styles.selectedCard
      ]}
      onPress={() => setSelectedBuyer(item)}
    >
      <Text style={styles.itemTitle}>{item.full_name}</Text>
      <Text style={styles.itemSubtitle}>{item.email}</Text>
      <Text style={styles.itemId}>ID: {item.id}</Text>
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Offer Creation</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading data...</Text>
          </View>
        ) : (
          <>
            {/* Listings Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a Listing</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedListing ? `Selected: ${selectedListing.title}` : 'Tap a listing to select it'}
              </Text>
              
              <FlatList
                data={listings}
                renderItem={renderListingItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            </View>
            
            {/* Users Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select a Buyer</Text>
              <Text style={styles.sectionSubtitle}>
                {selectedBuyer ? `Selected: ${selectedBuyer.full_name}` : 'Tap a user to select them as buyer'}
              </Text>
              
              <FlatList
                data={users}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
              />
            </View>
            
            {/* Offer Price Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Offer Price</Text>
              <TextInput
                style={styles.priceInput}
                value={offerPrice}
                onChangeText={setOfferPrice}
                placeholder="Enter offer price"
                keyboardType="numeric"
              />
            </View>
            
            {/* Create Button */}
            <TouchableOpacity 
              style={styles.createButton}
              onPress={handleCreateOffer}
              disabled={isCreatingOffer || !selectedListing || !selectedBuyer || !offerPrice}
            >
              {isCreatingOffer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Test Offer</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  listContainer: {
    paddingVertical: 8,
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemId: {
    fontSize: 12,
    color: '#999',
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
