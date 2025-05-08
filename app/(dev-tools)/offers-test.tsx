import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  Alert, ActivityIndicator, Switch, TextInput, Image,
  Modal, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import Animated, { 
  useSharedValue, useAnimatedStyle, withSpring, 
  runOnJS, useAnimatedGestureHandler 
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';

// Real authenticated user IDs for testing
const BUYER_UUID = '4d4f89d5-f566-491c-8197-ad4566d10d98';
const SELLER_UUID = 'fe63d687-5748-4508-95e2-46b82fc9c9a2';

// Types
interface TestListing {
  id: string;
  title: string;
  price: number;
  description: string;
  images: string[];
  seller_id: string;
  category: string;
  status: string;
  created_at: string;
  location: any; // Using any type for flexibility
  is_test: boolean;
}

interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  is_test: boolean;
  listings?: any; // For Supabase join results
  buyer_name?: string;
}

interface Chat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  is_active: boolean;
  created_at: string;
  is_test: boolean;
  messages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_mine?: boolean;
}

export default function OffersTest() {
  // State for current user role
  const [currentUserId, setCurrentUserId] = useState<string>(BUYER_UUID);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);
  
  // State for listings, offers, and chats
  const [testListings, setTestListings] = useState<TestListing[]>([]);
  const [pendingOffers, setPendingOffers] = useState<Offer[]>([]);
  const [activeChats, setActiveChats] = useState<Chat[]>([]);
  
  // State for new offer
  const [selectedListing, setSelectedListing] = useState<TestListing | null>(null);
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerMessage, setOfferMessage] = useState<string>('');
  
  // State for chat
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Log function for debug panel
  const logDebug = (message: string) => {
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };


  
  // Function to ensure test users exist in the users table
  const ensureTestUsersExist = async () => {
    try {
      logDebug('Checking if test users exist...');
      
      // Check if buyer profile exists
      const { data: buyerProfile, error: buyerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', BUYER_UUID)
        .single();
        
      if (buyerError && buyerError.code !== 'PGRST116') { // PGRST116 is 'not found'
        throw buyerError;
      }
      
      // Check if seller profile exists
      const { data: sellerProfile, error: sellerError } = await supabase
        .from('users')
        .select('id')
        .eq('id', SELLER_UUID)
        .single();
        
      if (sellerError && sellerError.code !== 'PGRST116') { // PGRST116 is 'not found'
        throw sellerError;
      }
      
      // Create buyer profile if it doesn't exist
      if (!buyerProfile) {
        logDebug('Creating test buyer profile...');
        const { error: createBuyerError } = await supabase
          .from('users')
          .upsert({
            id: BUYER_UUID,
            full_name: 'Test Buyer',
            email: 'test.buyer@example.com',
            avatar_url: 'https://via.placeholder.com/150',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: {
              city: 'Test City',
              state: 'Test State',
              country: 'Test Country',
              latitude: 37.7749,
              longitude: -122.4194,
              postal_code: '12345'
            },
            is_buyer: true,
            is_seller: false,
            is_test: true
          });
          
        if (createBuyerError) {
          // This might fail because of the foreign key constraint with auth.users
          // We'll continue anyway and use the mock users
          logDebug(`Error creating buyer profile: ${createBuyerError.message}`);
        } else {
          logDebug('Test buyer profile created successfully');
        }
      } else {
        logDebug('Test buyer profile already exists');
      }
      
      // Create seller profile if it doesn't exist
      if (!sellerProfile) {
        logDebug('Creating test seller profile...');
        const { error: createSellerError } = await supabase
          .from('users')
          .upsert({
            id: SELLER_UUID,
            full_name: 'Test Seller',
            email: 'test.seller@example.com',
            avatar_url: 'https://via.placeholder.com/150',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: {
              city: 'Test City',
              state: 'Test State',
              country: 'Test Country',
              latitude: 37.7749,
              longitude: -122.4194,
              postal_code: '12345'
            },
            is_buyer: false,
            is_seller: true,
            is_test: true
          });
          
        if (createSellerError) {
          // This might fail because of the foreign key constraint with auth.users
          // We'll continue anyway and use the mock users
          logDebug(`Error creating seller profile: ${createSellerError.message}`);
        } else {
          logDebug('Test seller profile created successfully');
        }
      } else {
        logDebug('Test seller profile already exists');
      }
      
      return true;
    } catch (error: any) {
      logDebug(`Error ensuring test users exist: ${error.message}`);
      return false;
    }
  };
  
  // Effect to load initial data
  useEffect(() => {
    const initData = async () => {
      // First ensure test users exist
      await ensureTestUsersExist();
      // Then load the rest of the data
      await refreshData();
    };
    
    initData();
  }, [currentUserId]);

  // Function to refresh all data
  const refreshData = async () => {
    setIsLoading(true);
    logDebug('Refreshing data...');
    
    try {
      await Promise.all([
        fetchTestListings(),
        fetchPendingOffers(),
        fetchActiveChats(),
      ]);
      logDebug('Data refresh complete');
    } catch (error: any) {
      logDebug(`Error refreshing data: ${error.message}`);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch test listings
  const fetchTestListings = async () => {
    try {
      // First check if we have test listings in the database
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('is_test', true)
        .limit(5);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // We have test listings in the database
        setTestListings(data);
        logDebug(`Fetched ${data.length} test listings from database`);
      } else {
        // No test listings in database, create them
        await createTestListings();
      }
    } catch (error: any) {
      logDebug(`Error fetching test listings: ${error.message}`);
      // Fallback to hardcoded listings without database insertion
      setTestListings(getHardcodedListings());
    }
  };

  // Function to create test listings if none exist
  const createTestListings = async () => {
    try {
      const hardcodedListings = getHardcodedListings();
      logDebug(`Inserting ${hardcodedListings.length} test listings into database...`);
      
      // Use upsert to avoid duplicate key errors
      const { data, error } = await supabase
        .from('listings')
        .upsert(
          hardcodedListings,
          { onConflict: 'id' } // Use id as the conflict resolution key
        );
        
      if (error) throw error;
      
      logDebug(`Successfully created/updated ${hardcodedListings.length} test listings`);
      
      // Fetch the listings we just created
      const { data: createdListings, error: fetchError } = await supabase
        .from('listings')
        .select('*')
        .eq('is_test', true)
        .in('id', hardcodedListings.map(l => l.id));
        
      if (fetchError) throw fetchError;
      
      setTestListings(createdListings || []);
      logDebug(`Fetched ${createdListings?.length || 0} test listings after creation`);
    } catch (error: any) {
      logDebug(`Error creating test listings: ${error.message}`);
      // Still set the hardcoded listings in the UI even if DB insertion fails
      setTestListings(getHardcodedListings());
    }
  };

  // Function to get hardcoded listings
  const getHardcodedListings = (): TestListing[] => {
    // Create a default location object that should satisfy the database constraints
    const defaultLocation = {
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      latitude: 37.7749,
      longitude: -122.4194,
      postal_code: '12345'
    };
    
    // Generate unique UUIDs for the test listings
    const listing1Id = '00000000-0000-0000-0000-000000000101';
    const listing2Id = '00000000-0000-0000-0000-000000000102';
    const listing3Id = '00000000-0000-0000-0000-000000000103';
    
    return [
      {
        id: listing1Id,
        title: 'Test Bicycle',
        price: 150,
        description: 'A test bicycle for sale',
        images: ['https://via.placeholder.com/300x300?text=Bicycle'],
        seller_id: SELLER_UUID,  // Using the real seller ID
        category: 'Sports',
        status: 'active',
        created_at: new Date().toISOString(),
        location: defaultLocation,
        is_test: true,
      },
      {
        id: listing2Id,
        title: 'Test Laptop',
        price: 800,
        description: 'A test laptop for sale',
        images: ['https://via.placeholder.com/300x300?text=Laptop'],
        seller_id: SELLER_UUID,  // Using the real seller ID
        category: 'Electronics',
        status: 'active',
        created_at: new Date().toISOString(),
        location: defaultLocation,
        is_test: true,
      },
      {
        id: listing3Id,
        title: 'Test Furniture',
        price: 250,
        description: 'Test furniture for sale',
        images: ['https://via.placeholder.com/300x300?text=Furniture'],
        seller_id: SELLER_UUID,  // Using the real seller ID
        category: 'Furniture',
        status: 'active',
        created_at: new Date().toISOString(),
        location: defaultLocation,
        is_test: true,
      },
    ];
  };

  // Function to fetch pending offers
  const fetchPendingOffers = async () => {
    try {
      if (currentUserId === SELLER_UUID) {
        // Try to fetch offers without the is_test filter first
        try {
          const { data, error } = await supabase
            .from('offers')
            .select(`
              *,
              listings:listing_id(*)
            `)
            .eq('seller_id', SELLER_UUID)
            .eq('status', 'pending');
            
          if (error) throw error;
          
          // Filter offers that are likely test offers (created by our test users)
          const testOffers = data?.filter(offer => 
            offer.buyer_id === BUYER_UUID || 
            offer.seller_id === SELLER_UUID
          ) || [];
          
          setPendingOffers(testOffers);
          logDebug(`Fetched ${testOffers.length} pending offers`);
        } catch (innerError: any) {
          // If that fails, try a simpler query
          const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('seller_id', SELLER_UUID)
            .eq('status', 'pending');
            
          if (error) throw error;
          
          const testOffers = data?.filter(offer => 
            offer.buyer_id === BUYER_UUID || 
            offer.seller_id === SELLER_UUID
          ) || [];
          
          setPendingOffers(testOffers);
          logDebug(`Fetched ${testOffers.length} pending offers (simple query)`);
        }
      } else {
        setPendingOffers([]);
      }
    } catch (error: any) {
      logDebug(`Error fetching pending offers: ${error.message}`);
      setPendingOffers([]);
    }
  };

  // Function to fetch active chats
  const fetchActiveChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          is_active,
          created_at,
          messages:messages(id, sender_id, content, created_at)
        `)
        .eq('is_test', true)
        .eq('is_active', true)
        .or(`buyer_id.eq.${BUYER_UUID},seller_id.eq.${SELLER_UUID}`)
        .order('last_message_at', { ascending: false });
        
      if (error) throw error;
      
      // Sort messages by created_at for each chat
      const chatsWithSortedMessages = data?.map((chat: any) => ({
        ...chat,
        messages: chat.messages?.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      })) || [];
      
      logDebug(`Fetched ${chatsWithSortedMessages.length} active chats`);
      setActiveChats(chatsWithSortedMessages);
      
      // Set active chat if not already set
      if (chatsWithSortedMessages.length > 0 && !activeChatId) {
        setActiveChatId(chatsWithSortedMessages[0].id);
      }
    } catch (error: any) {
      logDebug(`Error fetching active chats: ${error.message}`);
      setActiveChats([]);
    }
  };

  // Function to clear test data
  const clearTestData = async () => {
    try {
      setIsLoading(true);
      logDebug('Clearing test data...');
      
      // First, get all offers involving our test users
      const { data: testOffers, error: offersQueryError } = await supabase
        .from('offers')
        .select('id')
        .or(`buyer_id.eq.${BUYER_UUID},seller_id.eq.${SELLER_UUID}`);
        
      if (offersQueryError) throw offersQueryError;
      
      if (testOffers && testOffers.length > 0) {
        // Delete these offers
        const offerIds = testOffers.map(offer => offer.id);
        const { error: offersDeleteError } = await supabase
          .from('offers')
          .delete()
          .in('id', offerIds);
          
        if (offersDeleteError) throw offersDeleteError;
        logDebug(`Deleted ${offerIds.length} test offers`);
      }
      
      // Get all chats involving our test users
      const { data: testChats, error: chatsQueryError } = await supabase
        .from('chats')
        .select('id')
        .or(`buyer_id.eq.${BUYER_UUID},seller_id.eq.${SELLER_UUID}`);
        
      if (chatsQueryError) throw chatsQueryError;
      
      if (testChats && testChats.length > 0) {
        // Get all messages from these chats
        const chatIds = testChats.map(chat => chat.id);
        
        // Delete messages from these chats
        const { error: messagesDeleteError } = await supabase
          .from('messages')
          .delete()
          .in('chat_id', chatIds);
          
        if (messagesDeleteError) {
          logDebug(`Error deleting messages: ${messagesDeleteError.message}`);
          // Continue anyway, as this might fail if there are no messages
        }
        
        // Delete the chats
        const { error: chatsDeleteError } = await supabase
          .from('chats')
          .delete()
          .in('id', chatIds);
          
        if (chatsDeleteError) throw chatsDeleteError;
        logDebug(`Deleted ${chatIds.length} test chats`);
      }
      
      // Get all test listings
      const { data: testListings, error: listingsQueryError } = await supabase
        .from('listings')
        .select('id')
        .eq('is_test', true);
        
      if (listingsQueryError) throw listingsQueryError;
      
      if (testListings && testListings.length > 0) {
        // Delete test listings
        const listingIds = testListings.map(listing => listing.id);
        const { error: listingsDeleteError } = await supabase
          .from('listings')
          .delete()
          .in('id', listingIds);
          
        if (listingsDeleteError) throw listingsDeleteError;
        logDebug(`Deleted ${listingIds.length} test listings`);
      }
      
      // Note: We're not deleting the test profiles because they're needed for the dev tools to work
      // If you want to delete them, uncomment the following code:
      /*
      // Delete test profiles
      const { error: profilesDeleteError } = await supabase
        .from('profiles')
        .delete()
        .in('id', [BUYER_UUID, SELLER_UUID]);
        
      if (profilesDeleteError) throw profilesDeleteError;
      logDebug('Deleted test profiles');
      */
      
      logDebug('Test data cleared successfully');
      Alert.alert('Success', 'Test data cleared successfully');
      
      // Refresh data
      await refreshData();
    } catch (error: any) {
      logDebug(`Error clearing test data: ${error.message}`);
      Alert.alert('Error', `Failed to clear test data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom dropdown component for user selection
  const renderUserSelection = () => {
    return (
      <View style={styles.userSelectionContainer}>
        <Text style={styles.sectionTitle}>👥 Auth Simulation</Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Current User:</Text>
          <TouchableOpacity 
            style={styles.dropdownButton} 
            onPress={() => setShowUserDropdown(!showUserDropdown)}
          >
            <Text style={styles.dropdownButtonText}>
              {currentUserId === BUYER_UUID ? 'Test Buyer' : 'Test Seller'}
            </Text>
          </TouchableOpacity>
          
          {showUserDropdown && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity 
                style={styles.dropdownItem}
                onPress={() => {
                  setCurrentUserId(BUYER_UUID);
                  setShowUserDropdown(false);
                  logDebug('Switched user to: Buyer');
                  refreshData();
                }}
              >
                <Text style={styles.dropdownItemText}>Test Buyer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dropdownItem}
                onPress={() => {
                  setCurrentUserId(SELLER_UUID);
                  setShowUserDropdown(false);
                  logDebug('Switched user to: Seller');
                  refreshData();
                }}
              >
                <Text style={styles.dropdownItemText}>Test Seller</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Pressable 
          style={styles.clearButton}
          onPress={clearTestData}
        >
          <Text style={styles.clearButtonText}>🧹 Clear Test Data</Text>
        </Pressable>
      </View>
    );
  };

  // Function to create a new offer
  const createNewOffer = async () => {
    if (!selectedListing) {
      Alert.alert('Error', 'Please select a listing first');
      return;
    }
    
    if (!offerPrice || isNaN(parseFloat(offerPrice))) {
      Alert.alert('Error', 'Please enter a valid offer price');
      return;
    }
    
    try {
      setIsLoading(true);
      logDebug(`Creating offer for listing ${selectedListing.id} with price ${offerPrice}`);
      
      const offerData = {
        listing_id: selectedListing.id,
        buyer_id: BUYER_UUID,
        seller_id: SELLER_UUID,
        offer_price: parseFloat(offerPrice),
        message: offerMessage,
        status: 'pending',
        is_test: true,
        created_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('offers')
        .insert(offerData)
        .select();
        
      if (error) throw error;
      
      logDebug(`Offer created successfully with ID: ${data[0].id}`);
      Alert.alert('Success', 'Offer created successfully');
      
      // Reset form
      setSelectedListing(null);
      setOfferPrice('');
      setOfferMessage('');
      
      // Refresh data
      await refreshData();
    } catch (error: any) {
      logDebug(`Error creating offer: ${error.message}`);
      Alert.alert('Error', `Failed to create offer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render buyer panel
  const renderBuyerPanel = () => {
    if (currentUserId !== BUYER_UUID) return null;
    
    return (
      <View style={styles.panelContainer}>
        <Text style={styles.sectionTitle}>🛒 Buyer Panel</Text>
        
        <Text style={styles.subsectionTitle}>Available Listings</Text>
        <ScrollView horizontal style={styles.listingsContainer}>
          {testListings.map(listing => (
            <Pressable 
              key={listing.id}
              style={[
                styles.listingCard,
                selectedListing?.id === listing.id && styles.selectedListingCard
              ]}
              onPress={() => {
                setSelectedListing(listing);
                setOfferPrice(listing.price.toString());
                logDebug(`Selected listing: ${listing.title}`);
              }}
            >
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <Text style={styles.listingPrice}>${listing.price}</Text>
              {listing.images && listing.images.length > 0 && (
                <Image 
                  source={{ uri: listing.images[0] }} 
                  style={styles.listingImage}
                  resizeMode="cover"
                />
              )}
            </Pressable>
          ))}
        </ScrollView>
        
        {selectedListing && (
          <View style={styles.offerForm}>
            <Text style={styles.subsectionTitle}>Make an Offer</Text>
            <Text>Selected: {selectedListing.title}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Offer Price ($):</Text>
              <TextInput
                style={styles.input}
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="numeric"
                placeholder="Enter offer amount"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Message (optional):</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={offerMessage}
                onChangeText={setOfferMessage}
                placeholder="Enter a message to the seller"
                multiline
              />
            </View>
            
            <Pressable 
              style={styles.submitButton}
              onPress={createNewOffer}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Offer</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  // Render debug panel
  const renderDebugPanel = () => {
    return (
      <View style={styles.debugPanel}>
        <View style={styles.debugHeader}>
          <Text style={styles.debugTitle}>🐛 Debug Log</Text>
          <View style={styles.debugToggle}>
            <Text style={styles.debugToggleLabel}>Show</Text>
            <Switch
              value={showDebugPanel}
              onValueChange={setShowDebugPanel}
            />
          </View>
        </View>
        
        {showDebugPanel && (
          <ScrollView style={{ maxHeight: 150 }}>
            {debugLogs.map((log, index) => (
              <Text key={index} style={styles.debugLog}>{log}</Text>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  // Function to respond to an offer
  const respondToOffer = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      setIsLoading(true);
      logDebug(`Responding to offer ${offerId} with action: ${action}`);
      
      // Update offer status
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      const { error: updateError } = await supabase
        .from('offers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', offerId);
        
      if (updateError) throw updateError;
      
      logDebug(`Offer ${offerId} status updated to ${newStatus}`);
      
      // If declining, we're done
      if (action === 'reject') {
        logDebug(`Offer ${offerId} rejected successfully`);
        await refreshData();
        return;
      }
      
      // If accepting, get the offer details
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('*, listings:listing_id(*)')
        .eq('id', offerId)
        .single();
        
      if (offerError) throw offerError;
      
      // Check if chat already exists
      const { data: existingChats, error: chatCheckError } = await supabase
        .from('chats')
        .select('id')
        .eq('listing_id', offerData.listing_id)
        .eq('buyer_id', offerData.buyer_id)
        .eq('seller_id', offerData.seller_id);
        
      if (chatCheckError) throw chatCheckError;
      
      let chatId;
      
      if (existingChats && existingChats.length > 0) {
        // Use existing chat
        chatId = existingChats[0].id;
        
        // Update chat to active
        const { error: chatUpdateError } = await supabase
          .from('chats')
          .update({ 
            is_active: true,
            last_message_at: new Date().toISOString()
          })
          .eq('id', chatId);
          
        if (chatUpdateError) throw chatUpdateError;
        
        logDebug(`Updated existing chat ${chatId}`);
      } else {
        // Create new chat
        const chatData = {
          listing_id: offerData.listing_id,
          buyer_id: offerData.buyer_id,
          seller_id: offerData.seller_id,
          is_active: true,
          is_test: true,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        };
        
        const { data: newChat, error: chatCreateError } = await supabase
          .from('chats')
          .insert(chatData)
          .select();
          
        if (chatCreateError) throw chatCreateError;
        
        chatId = newChat[0].id;
        logDebug(`Created new chat ${chatId}`);
      }
      
      // Create a system message
      const messageData = {
        chat_id: chatId,
        sender_id: offerData.seller_id,
        content: `Offer of $${offerData.offer_price} has been accepted!`,
        is_read: false,
        is_test: true,
        created_at: new Date().toISOString()
      };
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (messageError) throw messageError;
      
      logDebug('Created acceptance message');
      setActiveChatId(chatId);
      
      Alert.alert('Success', `Offer ${action === 'accept' ? 'accepted' : 'rejected'} successfully`);
      await refreshData();
    } catch (error: any) {
      logDebug(`Error responding to offer: ${error.message}`);
      Alert.alert('Error', `Failed to ${action} offer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Swipeable offer card component
  const SwipeableOfferCard = ({ offer }: { offer: Offer }) => {
    const translateX = useSharedValue(0);
    
    const panGestureEvent = useAnimatedGestureHandler({
      onActive: (event) => {
        translateX.value = event.translationX;
      },
      onEnd: (event) => {
        if (event.translationX < -100) {
          translateX.value = withSpring(-1000);
          runOnJS(respondToOffer)(offer.id, 'reject');
        } else if (event.translationX > 100) {
          translateX.value = withSpring(1000);
          runOnJS(respondToOffer)(offer.id, 'accept');
        } else {
          translateX.value = withSpring(0);
        }
      },
    });
    
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: translateX.value }],
      };
    });
    
    const listing = offer.listings as any;
    
    // Add manual accept/reject buttons as a fallback
    const handleAccept = () => {
      respondToOffer(offer.id, 'accept');
    };
    
    const handleReject = () => {
      respondToOffer(offer.id, 'reject');
    };
    
    return (
      <View style={styles.offerCardContainer}>
        <View style={styles.offerCardBackground}>
          <View style={styles.rejectBackground}>
            <Text style={styles.actionText}>Reject</Text>
          </View>
          <View style={styles.acceptBackground}>
            <Text style={styles.actionText}>Accept</Text>
          </View>
        </View>
        
        <PanGestureHandler onGestureEvent={panGestureEvent}>
          <Animated.View style={[styles.offerCard, animatedStyle]}>
            <Text style={styles.offerTitle}>
              {listing?.title || 'Unknown Item'}
            </Text>
            <Text style={styles.offerPrice}>
              Offer: ${offer.offer_price}
            </Text>
            <Text style={styles.offerBuyer}>
              From: Test Buyer
            </Text>
            {offer.message && (
              <Text style={styles.offerMessage}>
                "{offer.message}"
              </Text>
            )}
            <Text style={styles.offerInstructions}>
              Swipe right to accept, left to reject
            </Text>
            
            {/* Fallback buttons in case swiping doesn't work */}
            <View style={styles.fallbackButtons}>
              <TouchableOpacity 
                style={[styles.fallbackButton, styles.rejectButton]}
                onPress={handleReject}
              >
                <Text style={styles.fallbackButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.fallbackButton, styles.acceptButton]}
                onPress={handleAccept}
              >
                <Text style={styles.fallbackButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  };

  // Render seller panel with swipeable offer cards
  const renderSellerPanel = () => {
    if (currentUserId !== SELLER_UUID) return null;
    
    return (
      <View style={styles.panelContainer}>
        <Text style={styles.sectionTitle}>📥 Seller Panel</Text>
        
        {pendingOffers.length === 0 ? (
          <Text style={styles.emptyText}>No pending offers</Text>
        ) : (
          <View>
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectActionButton]}
                onPress={() => respondToOffer(pendingOffers[0].id, 'reject')}
              >
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptActionButton]}
                onPress={() => respondToOffer(pendingOffers[0].id, 'accept')}
              >
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {pendingOffers.map(offer => (
                <SwipeableOfferCard key={offer.id} offer={offer} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Function to send a message
  const sendMessage = async () => {
    if (!activeChatId || !newMessage.trim()) return;
    
    try {
      setIsLoading(true);
      logDebug(`Sending message to chat ${activeChatId}`);
      
      const messageData = {
        chat_id: activeChatId,
        sender_id: currentUserId,
        content: newMessage.trim(),
        is_read: false,
        is_test: true,
        created_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(messageData);
        
      if (error) throw error;
      
      // Update chat's last_message_at
      await supabase
        .from('chats')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeChatId);
      
      logDebug('Message sent successfully');
      setNewMessage('');
      
      // Refresh chats to show the new message
      await fetchActiveChats();
    } catch (error: any) {
      logDebug(`Error sending message: ${error.message}`);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render chat section
  const renderChatSection = () => {
    if (activeChats.length === 0) {
      return (
        <View style={styles.chatSection}>
          <Text style={styles.sectionTitle}>💬 Chat Log</Text>
          <Text style={styles.emptyText}>No active chats yet. Accept an offer to start a chat.</Text>
        </View>
      );
    }
    
    // Find active chat
    const activeChat = activeChatId ? 
      activeChats.find(chat => chat.id === activeChatId) : 
      activeChats[0];
    
    if (!activeChat) return null;
    
    return (
      <View style={styles.chatSection}>
        <Text style={styles.sectionTitle}>💬 Chat Log</Text>
        <Text style={styles.chatTitle}>
          Chat for listing: {activeChat.listing_id}
        </Text>
        
        <View style={styles.chatContainer}>
          {activeChat.messages && activeChat.messages.length > 0 ? (
            <ScrollView style={styles.chatMessages}>
              {activeChat.messages.map((message: any) => (
                <View 
                  key={message.id} 
                  style={[
                    styles.messageContainer,
                    message.sender_id === currentUserId ? 
                      styles.myMessage : 
                      styles.theirMessage
                  ]}
                >
                  <Text 
                    style={[
                      styles.messageText,
                      message.sender_id === currentUserId ? 
                        styles.myMessageText : 
                        styles.theirMessageText
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text 
                    style={[
                      styles.messageTime,
                      message.sender_id === currentUserId ? 
                        styles.myMessageTime : 
                        styles.theirMessageTime
                    ]}
                  >
                    {new Date(message.created_at).toLocaleTimeString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.emptyText}>No messages yet</Text>
          )}
          
          {/* Message input field */}
          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
            />
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={sendMessage}
              disabled={isLoading || !newMessage.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderUserSelection()}
      <View style={styles.content}>
        {renderBuyerPanel()}
        {renderSellerPanel()}
      </View>
      {renderChatSection()}
      {renderDebugPanel()}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userSelectionContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  pickerLabel: {
    fontSize: 16,
    marginRight: 12,
    width: 100,
  },
  dropdownButton: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  dropdownButtonText: {
    fontSize: 16,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    left: 100,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    zIndex: 2,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
  },
  // Buyer panel styles
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  panelContainer: {
    flex: 1,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  listingsContainer: {
    flexGrow: 0,
    marginBottom: 16,
  },
  listingCard: {
    width: 150,
    height: 200,
    marginRight: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedListingCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listingPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  listingImage: {
    width: '100%',
    height: 100,
    borderRadius: 4,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  offerForm: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  inputContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  // Seller panel styles
  offerCardContainer: {
    height: 150,
    marginBottom: 16,
    position: 'relative',
  },
  offerCardBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  rejectBackground: {
    flex: 1,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  acceptBackground: {
    flex: 1,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    height: '100%',
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  offerPrice: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  offerBuyer: {
    fontSize: 14,
    marginBottom: 8,
  },
  offerMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  offerInstructions: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  fallbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  fallbackButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    flex: 1,
    margin: 4,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  fallbackButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
  },
  rejectActionButton: {
    backgroundColor: '#FF3B30',
  },
  acceptActionButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // Chat section styles
  chatSection: {
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chatContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  chatMessages: {
    maxHeight: 250,
  },
  messageContainer: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 14,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#000',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'right',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: 'rgba(0, 0, 0, 0.7)',
  },
  messageInputContainer: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Debug panel styles
  debugPanel: {
    padding: 16,
    backgroundColor: '#1e1e1e',
    maxHeight: 200,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  debugLog: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugToggleLabel: {
    color: '#fff',
    marginRight: 8,
  },
});
