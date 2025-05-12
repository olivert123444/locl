import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getPendingOffers, respondToOffer } from '@/lib/supabase';
import BottomTabBar from '@/components/BottomTabBar';

// Define chat match interface
interface ChatMatch {
  id: string;
  productName: string;
  price: number;
  productImage: string;
  sellerName: string;
  buyerName: string;
  otherUserName: string;
  otherUserRole: string;
  userRole: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  imageUrl: string;
  title: string;
  buyerAvatarUrl: string; // Added for buyer avatar
  sellerAvatarUrl: string; // Added for seller avatar
}

// Helper function to get a user's display name from their profile
const getUserDisplayName = (userProfile: any, fallbackRole: string = 'User'): string => {
  if (!userProfile) return `Unknown ${fallbackRole}`;
  
  // Use full_name as the primary source of user names
  // If that's not available, try to use the email as a fallback
  const displayName = userProfile.full_name || 
                     (userProfile.email ? userProfile.email.split('@')[0] : null);
  
  // If we found a name, return it, otherwise return the fallback
  return displayName || `Unknown ${fallbackRole}`;
};

// Define Supabase response types
interface SupabaseChat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  is_active?: boolean;
  last_message_at?: string;
  listings?: {
    title?: string;
    price?: number;
    images?: string[];
    seller_id?: string;
  };
  buyer?: {
    id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  seller?: {
    id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  buyerUser?: {
    id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  sellerUser?: {
    id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  };
  latest_message?: {
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    is_read: boolean;
  };
}

// Define Pending Offer interface
interface PendingOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offer_price: number;
  message?: string;
  status: string;
  created_at: string;
  formatted_price?: string;
  listing_title?: string;
  buyer_name?: string;
  display_message?: string;
  listings?: {
    id?: string;
    title?: string;
    price?: number;
    images?: string[];
  } | Array<{
    id?: string;
    title?: string;
    price?: number;
    images?: string[];
  }>;
  buyer_profile?: {
    id?: string;
    full_name?: string;
    avatar_url?: string;
  } | Array<{
    id?: string;
    full_name?: string;
    avatar_url?: string;
  }>;
}

// Initial empty chat/match data
const initialChatMatches: ChatMatch[] = [];
export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatMatch | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [chatData, setChatData] = useState<ChatMatch[]>(initialChatMatches);
  const [pendingOffers, setPendingOffers] = useState<PendingOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [activeTab, setActiveTab] = useState<'offers' | 'messages'>('messages');
  
  // Debug state
  const [debugMessages, setDebugMessages] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const [offerQueryResult, setOfferQueryResult] = useState<{
    userId: string;
    count: number;
    offers: any[] | null;
    error: any | null;
  }>({ userId: '', count: 0, offers: null, error: null });
  
  // Function to add debug message to UI
  const addDebugMessage = (message: string) => {
    setDebugMessages(prev => {
      // Keep only the last 5 messages to avoid cluttering the UI
      const newMessages = [message, ...prev];
      return newMessages.slice(0, 5);
    });
  };
  
  // Test offer creation state
  const [showTestOfferModal, setShowTestOfferModal] = useState(false);
  const [testListingId, setTestListingId] = useState('');
  const [testBuyerId, setTestBuyerId] = useState('');
  const [testOfferPrice, setTestOfferPrice] = useState('');
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  
  // For swipe animation
  const swipeAnimMap = useRef<Map<string, Animated.ValueXY>>(new Map());
  const swipeActionMap = useRef<Map<string, boolean>>(new Map());
  
  // Track if there are new offers
  const [hasNewOffers, setHasNewOffers] = useState<boolean>(false);
  
  // Function to refresh chats data
  const refreshChats = async () => {
    if (!user) return;
    
    console.log('🔍 DEBUG - refreshChats - Starting for user:', user.id);
    setIsLoading(true);
    try {
      // Fetch chats directly from Supabase
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          created_at,
          is_active,
          last_message_at,
          listings:listing_id(id, title, price, images, seller_id),
          buyer:users!chats_buyer_id_fkey(id, full_name, email, avatar_url),
          seller:users!chats_seller_id_fkey(id, full_name, email, avatar_url)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching chats:', error);
        throw error;
      }
      
      if (chats && chats.length > 0) {
        // Convert to ChatMatch format
        const formattedChats: ChatMatch[] = chats.map(chat => {
          // Determine if user is buyer or seller
          const isBuyer = chat.buyer_id === user.id;
          
          // Get the listing data - handle potential array returns from Supabase
          const listingData = Array.isArray(chat.listings) ? chat.listings[0] : chat.listings || {};
          
          // Get main image URL from images array
          const mainImageUrl = listingData.images && Array.isArray(listingData.images) && listingData.images.length > 0 
            ? listingData.images[0] 
            : 'https://via.placeholder.com/150';
          
          // Get buyer and seller users - handle potential array returns from Supabase
          const buyer = Array.isArray(chat.buyer) ? chat.buyer[0] : chat.buyer || {};
          const seller = Array.isArray(chat.seller) ? chat.seller[0] : chat.seller || {};
          const otherUser = isBuyer ? seller : buyer;
          
          // Get names using the getUserDisplayName helper
          const buyerName = getUserDisplayName(buyer);
          const sellerName = getUserDisplayName(seller);
          
          // Get avatar URLs with fallbacks
          const buyerAvatarUrl = buyer?.avatar_url || 'https://via.placeholder.com/150';
          const sellerAvatarUrl = seller?.avatar_url || 'https://via.placeholder.com/150';
          
          // Get the other user's name based on current user's role
          const otherUserName = isBuyer ? sellerName : buyerName;
          const otherUserRole = isBuyer ? 'Seller' : 'Buyer';
          
          // Use last_message_at to determine if there's a message
          const hasMessage = !!chat.last_message_at;
          
          return {
            id: chat.id,
            productName: listingData.title || 'Unknown Product',
            price: listingData.price || 0,
            productImage: mainImageUrl,
            buyerName: buyerName,
            sellerName: sellerName,
            otherUserName: otherUserName,
            otherUserRole: otherUserRole,
            userRole: isBuyer ? 'Buyer' : 'Seller',
            lastMessage: hasMessage ? 'View conversation' : 'Start chatting!',
            lastMessageTime: hasMessage 
              ? new Date(chat.last_message_at).toLocaleDateString() 
              : new Date(chat.created_at).toLocaleDateString(),
            unreadCount: 0, // We'll update this later if needed
            imageUrl: mainImageUrl,
            title: listingData.title || 'Unknown Product',
            buyerAvatarUrl: buyerAvatarUrl,
            sellerAvatarUrl: sellerAvatarUrl
          };
        });
        
        setChatData(formattedChats);
      } else {
        // If no chats found, show empty state
        setChatData([]);
      }
      
      // Fetch pending offers
      const offers = await getPendingOffers(user.id) as PendingOffer[];
      setPendingOffers(offers || []);
      
      // Check if there are new offers
      setHasNewOffers(offers && offers.length > 0);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch chats and pending offers from Supabase when component mounts or user changes
  useEffect(() => {
    // Reset state when user changes to avoid showing stale data
    if (!user) {
      setChatData([]);
      setPendingOffers([]);
      setOfferQueryResult({ userId: '', count: 0, offers: null, error: null });
      return;
    }
    
    const fetchChats = async () => {
      console.log('🔍 DEBUG - fetchChats - Starting for user:', user.id);
      addDebugMessage(`Fetching chats for user: ${user.id}`);
      setIsLoading(true);
      try {
        // Fetch chats directly from Supabase
        console.log('🔍 DEBUG - fetchChats - Fetching chats from Supabase');
        
        // Get all chats where the user is either buyer or seller
        const { data: chats, error } = await supabase
          .from('chats')
          .select(`
            id,
            listing_id,
            buyer_id,
            seller_id,
            created_at,
            is_active,
            last_message_at,
            listings:listing_id(id, title, price, images, seller_id),
            buyer:users!chats_buyer_id_fkey(id, full_name, email, avatar_url),
            seller:users!chats_seller_id_fkey(id, full_name, email, avatar_url)
          `)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .eq('is_active', true)
          .order('last_message_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching chats:', error);
          throw error;
        }
        
        console.log('🔍 DEBUG - fetchChats - Received chats:', chats?.length || 0);
        
        if (chats && chats.length > 0) {
          // Convert Supabase chats to ChatMatch format
          const formattedChats: ChatMatch[] = chats.map(chat => {
            // Determine if user is buyer or seller
            const isBuyer = chat.buyer_id === user.id;
            
            // Get the listing data - handle potential array returns from Supabase
            const listingData = Array.isArray(chat.listings) ? chat.listings[0] : chat.listings || {};
            
            // Get main image URL from images array
            const mainImageUrl = listingData.images && Array.isArray(listingData.images) && listingData.images.length > 0 
              ? listingData.images[0] 
              : 'https://via.placeholder.com/150';
            
            // Get buyer and seller users - handle potential array returns from Supabase
            const buyerUser = Array.isArray(chat.buyer) ? chat.buyer[0] : chat.buyer || {};
            const sellerUser = Array.isArray(chat.seller) ? chat.seller[0] : chat.seller || {};
            const otherUser = isBuyer ? sellerUser : buyerUser;
            
            // Get names using the getUserDisplayName helper
            const buyerName = getUserDisplayName(buyerUser);
            const sellerName = getUserDisplayName(sellerUser);
            
            // Get avatar URLs with fallbacks
            const buyerAvatarUrl = buyerUser?.avatar_url || 'https://via.placeholder.com/150';
            const sellerAvatarUrl = sellerUser?.avatar_url || 'https://via.placeholder.com/150';
            
            // Get the other user's name based on current user's role
            const otherUserName = isBuyer ? sellerName : buyerName;
            const otherUserRole = isBuyer ? 'Seller' : 'Buyer';
            
            // Fetch the latest message for this chat
            const fetchLatestMessage = async () => {
              try {
                const { data: messages, error } = await supabase
                  .from('messages')
                  .select('*')
                  .eq('chat_id', chat.id)
                  .order('created_at', { ascending: false })
                  .limit(1);
                  
                if (error) {
                  console.error('Error fetching latest message:', error);
                  return null;
                }
                
                return messages && messages.length > 0 ? messages[0] : null;
              } catch (error) {
                console.error('Error in fetchLatestMessage:', error);
                return null;
              }
            };
            
            // Use last_message_at to determine if there's a message
            const hasMessage = !!chat.last_message_at;
            
            return {
              id: chat.id,
              productName: listingData.title || 'Unknown Product',
              price: listingData.price || 0,
              productImage: mainImageUrl,
              buyerName: buyerName,
              sellerName: sellerName,
              otherUserName: otherUserName,
              otherUserRole: otherUserRole,
              userRole: isBuyer ? 'Buyer' : 'Seller',
              lastMessage: hasMessage ? 'View conversation' : 'Start chatting!',
              lastMessageTime: hasMessage 
                ? new Date(chat.last_message_at).toLocaleDateString() 
                : new Date(chat.created_at).toLocaleDateString(),
              unreadCount: 0, // We'll update this later if needed
              imageUrl: mainImageUrl,
              title: listingData.title || 'Unknown Product',
              buyerAvatarUrl: buyerAvatarUrl,
              sellerAvatarUrl: sellerAvatarUrl
            };
          });
          
          console.log('🔍 DEBUG - fetchChats - Formatted chats:', formattedChats.length);
          setChatData(formattedChats);
        } else {
          console.log('🔍 DEBUG - fetchChats - No chats found, showing empty state');
          // If no chats found, show empty state
          setChatData([]);
        }
      } catch (error) {
        console.error('Error fetching chats:', error);
        // If there's an error, show empty state
        setChatData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchPendingOffers = async () => {
      // User check is now handled at the top level of useEffect
      console.log('🔍 DEBUG - fetchPendingOffers - Starting for user:', user.id);
      addDebugMessage(`Fetching pending offers for user: ${user.id}`);
      setIsLoadingOffers(true);
      try {
        // Only fetch pending offers if user is a seller
        console.log('🔍 DEBUG - fetchPendingOffers - Calling getPendingOffers');
        const offers = await getPendingOffers(user.id) as PendingOffer[];
        console.log('🔍 DEBUG - fetchPendingOffers - Pending offers received:', offers?.length || 0);
        console.log('🔍 DEBUG - fetchPendingOffers - First offer details:', offers && offers.length > 0 ? JSON.stringify(offers[0], null, 2) : 'No offers');
        
        // Double-check that all offers are pending (defensive programming)
        // This ensures we don't rely on stale state from before a swipe action
        const pendingOffersOnly = offers ? offers.filter(offer => offer.status === 'pending') : [];
        
        // Log if any non-pending offers were filtered out
        if (pendingOffersOnly.length !== offers?.length) {
          console.log('🔍 DEBUG - fetchPendingOffers - Filtered out', 
            (offers?.length || 0) - pendingOffersOnly.length, 
            'non-pending offers');
        }
        
        // Store query results for debugging panel
        setOfferQueryResult({
          userId: user.id,
          count: pendingOffersOnly.length,
          offers: pendingOffersOnly,
          error: null
        });
        
        setPendingOffers(pendingOffersOnly);
        
        // Initialize animation values for each offer
        console.log('🔍 DEBUG - fetchPendingOffers - Initializing animation values for offers');
        offers.forEach(offer => {
          if (!swipeAnimMap.current.has(offer.id)) {
            console.log('🔍 DEBUG - fetchPendingOffers - Setting animation for offer:', offer.id);
            swipeAnimMap.current.set(offer.id, new Animated.ValueXY());
          }
        });
      } catch (error) {
        console.error('Error fetching pending offers:', error);
        // Store error in debug state
        setOfferQueryResult({
          userId: user.id,
          count: 0,
          offers: null,
          error: error
        });
        setPendingOffers([]);
      } finally {
        setIsLoadingOffers(false);
      }
    };
    
    fetchChats();
    fetchPendingOffers();
    
    // Set up an interval to check for new chats and offers periodically
    const interval = setInterval(() => {
      fetchChats();
      fetchPendingOffers();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [user]);
  // Handle offer response (accept/decline)
  const handleOfferResponse = async (offerId: string, action: 'accept' | 'decline') => {
    try {
      console.log('🔍 DEBUG - handleOfferResponse - Starting with offerId:', offerId, 'action:', action);
      addDebugMessage(`${action === 'accept' ? 'Accepting' : 'Declining'} offer: ${offerId}`);
      
      // Find the offer in the current state to log details
      const offerToRespond = pendingOffers.find(o => o.id === offerId);
      console.log('🔍 DEBUG - handleOfferResponse - Offer details:', offerToRespond ? 
        JSON.stringify({
          id: offerToRespond.id,
          listing_id: offerToRespond.listing_id,
          buyer_id: offerToRespond.buyer_id,
          seller_id: offerToRespond.seller_id,
          offer_price: offerToRespond.offer_price,
          status: offerToRespond.status
        }, null, 2) : 'Offer not found in state');
      
      console.log('🔍 DEBUG - handleOfferResponse - Calling respondToOffer');
      const response = await respondToOffer(offerId, action);
      console.log('🔍 DEBUG - handleOfferResponse - Response from respondToOffer:', JSON.stringify(response, null, 2));
      addDebugMessage(`Offer ${action} successful`);
      
      // Completely replace the offers list with fresh data from Supabase
      console.log('🔍 DEBUG - handleOfferResponse - Fetching fresh offers list from Supabase');
      const freshOffers = await getPendingOffers(user!.id) as PendingOffer[];
      console.log('🔍 DEBUG - handleOfferResponse - Fresh offers count:', freshOffers?.length || 0);
      
      // Verify that all offers have status === 'pending'
      const allPending = freshOffers?.every(offer => offer.status === 'pending');
      console.log('🔍 DEBUG - handleOfferResponse - All offers have pending status:', allPending);
      
      // Log the IDs of the fresh offers for debugging
      console.log('🔍 DEBUG - handleOfferResponse - Fresh offer IDs:', 
        freshOffers?.map(o => o.id).join(', ') || 'none');
      
      // Completely overwrite the existing offers array with the filtered results
      // This ensures the offer card is removed from view after action
      setPendingOffers(freshOffers || []);
      
      // Update the debug panel with the fresh data
      setOfferQueryResult({
        userId: user!.id,
        count: freshOffers?.length || 0,
        offers: freshOffers,
        error: null
      });
      
      // Show success message
      Alert.alert(
        action === 'accept' ? 'Offer Accepted' : 'Offer Declined',
        action === 'accept' 
          ? 'You have accepted the offer. A message has been sent to the buyer.'
          : 'You have declined the offer.',
        [{ text: 'OK' }]
      );
      
      // If accepted, refresh chats to show the new chat
      if (action === 'accept') {
        console.log('🔍 DEBUG - handleOfferResponse - Offer accepted, refreshing chats to show new conversation');
        // Switch to the messages tab
        setActiveTab('messages');
        
        // Fetch updated chats
        console.log('🔍 DEBUG - handleOfferResponse - Fetching updated chats');
        addDebugMessage(`Creating chat for accepted offer`);
        
        // Fetch chats directly from Supabase
        const { data: chats, error } = await supabase
          .from('chats')
          .select(`
            id,
            listing_id,
            buyer_id,
            seller_id,
            created_at,
            is_active,
            last_message_at,
            listings:listing_id(id, title, price, images, seller_id),
            buyer:users!chats_buyer_id_fkey(id, full_name, email, avatar_url),
            seller:users!chats_seller_id_fkey(id, full_name, email, avatar_url)
          `)
          .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
          .eq('is_active', true)
          .order('last_message_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching chats:', error);
          Alert.alert('Error', `Failed to ${action} offer. Please try again.`);
          return;
        }
        
        console.log('🔍 DEBUG - handleOfferResponse - Fetched updated chats after offer acceptance:', chats?.length || 0);
        
        // Log the most recent chat which should be the newly created one
        if (chats && chats.length > 0) {
          // Process and update the chat data
          refreshChats();
        }
      }
    } catch (error) {
      console.error(`🔍 DEBUG - handleOfferResponse - Error ${action === 'accept' ? 'accepting' : 'declining'} offer:`, error);
      console.log('🔍 DEBUG - handleOfferResponse - Error details:', error instanceof Error ? error.message : String(error));
      Alert.alert('Error', `Failed to ${action} offer. Please try again.`);
    }
  };

  // Create a pan responder for each offer item
  const createPanResponder = (offerId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal swiping
        const anim = swipeAnimMap.current?.get(offerId);
        if (anim) {
          anim.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const anim = swipeAnimMap.current?.get(offerId);
        if (!anim) return;
        
        const SWIPE_THRESHOLD = 120; // Minimum distance to trigger swipe action
        
        // If swiped far enough to the right (accept)
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Mark as being processed to prevent double actions
          if (swipeActionMap.current?.get(offerId)) return;
          swipeActionMap.current?.set(offerId, true);
          
          // Animate to the right edge
          Animated.timing(anim, {
            toValue: { x: 500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            handleOfferResponse(offerId, 'accept');
          });
        }
        // If swiped far enough to the left (decline)
        else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Mark as being processed to prevent double actions
          if (swipeActionMap.current?.get(offerId)) return;
          swipeActionMap.current?.set(offerId, true);
          
          // Animate to the left edge
          Animated.timing(anim, {
            toValue: { x: -500, y: 0 },
            duration: 300,
            useNativeDriver: false,
          }).start(() => {
            handleOfferResponse(offerId, 'decline');
          });
        }
        // If not swiped far enough, spring back to center
        else {
          Animated.spring(anim, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      }
    });
  };
  // Render a swipeable offer item
  const renderOfferItem = ({ item }: { item: PendingOffer }) => {
    // Skip rendering if the offer is not pending
    if (item.status !== 'pending') {
      console.log('🔍 DEBUG - renderOfferItem - Skipping non-pending offer:', item.id, 'status:', item.status);
      return null;
    }
    
    const panResponder = createPanResponder(item.id);
    const anim = swipeAnimMap.current?.get(item.id) || new Animated.ValueXY();
    
    // Interpolate opacity for accept/decline indicators
    const acceptOpacity = anim.x.interpolate({
      inputRange: [0, 75],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    
    const declineOpacity = anim.x.interpolate({
      inputRange: [-75, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    
    // Get listing data, handling both object and array formats
    const listing = Array.isArray(item.listings) ? item.listings[0] : item.listings;
    const buyerProfile = Array.isArray(item.buyer_profile) ? item.buyer_profile[0] : item.buyer_profile;
    
    // Get image URL from the listing
    const imageUrl = listing?.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://via.placeholder.com/150';
      
    return (
      <View style={styles.offerItemContainer}>
        {/* Decline indicator (left side) */}
        <Animated.View style={[styles.actionIndicator, styles.declineIndicator, { opacity: declineOpacity }]}>
          <Ionicons name="close-circle" size={40} color="#FF3B30" />
          <Text style={styles.actionText}>Decline</Text>
        </Animated.View>
        
        {/* Accept indicator (right side) */}
        <Animated.View style={[styles.actionIndicator, styles.acceptIndicator, { opacity: acceptOpacity }]}>
          <Ionicons name="checkmark-circle" size={40} color="#34C759" />
          <Text style={styles.actionText}>Accept</Text>
        </Animated.View>
        
        {/* Swipeable offer card */}
        <Animated.View 
          style={[styles.offerItem, { transform: anim.getTranslateTransform() }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.offerImageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.offerImage} />
          </View>
          <View style={styles.offerInfo}>
            <View style={styles.offerHeader}>
              <Text style={styles.productName} numberOfLines={1}>{listing?.title || 'Unknown Product'}</Text>
              <Text style={styles.offerPrice}>${item.offer_price}</Text>
            </View>
            <Text style={styles.buyerName}>{getUserDisplayName(buyerProfile, 'Buyer')}</Text>
            <View style={styles.offerDetails}>
              <Text style={styles.offerText}>New Offer</Text>
              <Text style={styles.offerTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };
  
  const renderChatItem = ({ item }: { item: ChatMatch }) => {
    // Determine if the current user is the buyer or seller
    const isBuyer = item.userRole === 'Buyer';
    
    // Choose the appropriate image source based on user role
    // Buyers see the product image, sellers see the buyer's avatar
    const imageSource = isBuyer 
      ? { uri: item.productImage } // Buyer sees product image
      : { uri: item.buyerAvatarUrl }; // Seller sees buyer avatar
    
    return (
      <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => {
          router.push({
            pathname: '/(app)/chat/[id]',
            params: { 
              id: item.id,
              otherUserName: item.otherUserName,
              otherUserRole: item.otherUserRole,
              userRole: item.userRole,
              listingTitle: item.title
            }
          });
        }}
      >
        <View style={styles.chatImageContainer}>
          <Image 
            source={imageSource} 
            style={styles.chatImage} 
            accessibilityLabel={isBuyer ? `Product: ${item.title}` : `Buyer: ${item.buyerName}`}
          />
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
            <Text style={styles.chatTime}>{item.lastMessageTime}</Text>
          </View>
          <View style={styles.userInfoRow}>
            <Text style={styles.userName}>{item.otherUserName}</Text>
            <Text style={styles.userRole}>({item.otherUserRole})</Text>
          </View>
          <Text 
            style={[styles.lastMessage, item.unreadCount > 0 && styles.unreadMessage]} 
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  // Main render function for the component
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Debug Overlay */}
      {showDebug && debugMessages.length > 0 && (
        <View style={styles.debugOverlay}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <TouchableOpacity onPress={() => setShowDebug(false)}>
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {debugMessages.map((msg, index) => (
            <Text key={index} style={styles.debugText}>{msg}</Text>
          ))}
        </View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setShowTestOfferModal(true)}
        >
          <Text style={styles.createButtonText}>+ Test Offer</Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'offers' && styles.activeTab]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, activeTab === 'offers' && styles.activeTabText]}>
            New Offers {pendingOffers.length > 0 && `(${pendingOffers.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.listWrapper}>
        {/* Pending Offers Section */}
        {activeTab === 'offers' && pendingOffers.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>New Offers</Text>
              <Text style={styles.sectionSubtitle}>Swipe right to accept, left to decline</Text>
            </View>
            
            {isLoadingOffers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading offers...</Text>
              </View>
            ) : (
              <View style={styles.offersContainer}>
                {/* Filter to ensure only pending offers are rendered */}
                {pendingOffers
                  .filter(offer => offer.status === 'pending')
                  .map(offer => (
                    <View key={offer.id} style={styles.offerWrapper}>
                      {renderOfferItem({ item: offer })}
                    </View>
                  ))}
              </View>
            )}
          </View>
        )}
        
        {/* Empty Offers State */}
        {activeTab === 'offers' && pendingOffers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No Offers Yet</Text>
            <Text style={styles.emptySubtext}>When buyers make offers on your items, they'll appear here</Text>
          </View>
        )}
        
        {/* Debug Panel for Offers */}
        {activeTab === 'offers' && (
          <View style={styles.debugPanel}>
            <View style={styles.debugPanelHeader}>
              <Text style={styles.debugPanelTitle}>Offers Debug Info</Text>
              <TouchableOpacity onPress={() => setShowDebug(!showDebug)}>
                <Text style={styles.debugPanelToggle}>{showDebug ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            
            {showDebug && (
              <View style={styles.debugPanelContent}>
                <Text style={styles.debugPanelLabel}>Current User ID:</Text>
                <Text style={styles.debugPanelValue}>{offerQueryResult.userId || 'Not available'}</Text>
                
                <Text style={styles.debugPanelLabel}>Offers Returned:</Text>
                <Text style={styles.debugPanelValue}>{offerQueryResult.count}</Text>
                
                <Text style={styles.debugPanelLabel}>Query Status:</Text>
                <Text style={styles.debugPanelValue}>
                  {offerQueryResult.error ? 'Error' : offerQueryResult.offers ? 'Success' : 'No data'}
                </Text>
                
                {offerQueryResult.error && (
                  <>
                    <Text style={styles.debugPanelLabel}>Error:</Text>
                    <Text style={styles.debugPanelValue}>{JSON.stringify(offerQueryResult.error, null, 2)}</Text>
                  </>
                )}
                
                <Text style={styles.debugPanelLabel}>First Offer (if any):</Text>
                <ScrollView style={styles.debugPanelScrollView}>
                  <Text style={styles.debugPanelCode}>
                    {offerQueryResult.offers && offerQueryResult.offers.length > 0 
                      ? JSON.stringify(offerQueryResult.offers[0], null, 2) 
                      : 'No offers found'}
                  </Text>
                </ScrollView>
              </View>
            )}
          </View>
        )}
        
        {/* Chats Section */}
        {activeTab === 'messages' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Messages</Text>
            </View>
            
            {isLoading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.emptyText}>Loading chats...</Text>
              </View>
            ) : chatData.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No chats yet</Text>
                <Text style={styles.emptySubtext}>Swipe right on items you're interested in to start chatting with sellers</Text>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => router.push('/(app)/nearby')}
                >
                  <Text style={styles.browseButtonText}>Browse Items</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.chatsContainer}>
                {chatData.map(chat => (
                  <View key={chat.id}>
                    {renderChatItem({ item: chat })}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Test Offer Modal */}
      <Modal
        visible={showTestOfferModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTestOfferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Test Offer</Text>
              <TouchableOpacity onPress={() => setShowTestOfferModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Listing ID:</Text>
            <TextInput
              style={styles.input}
              value={testListingId}
              onChangeText={setTestListingId}
              placeholder="Enter listing ID"
            />

            <Text style={styles.inputLabel}>Buyer ID:</Text>
            <TextInput
              style={styles.input}
              value={testBuyerId}
              onChangeText={setTestBuyerId}
              placeholder="Enter buyer ID"
            />

            <Text style={styles.inputLabel}>Offer Price:</Text>
            <TextInput
              style={styles.input}
              value={testOfferPrice}
              onChangeText={setTestOfferPrice}
              placeholder="Enter offer price"
              keyboardType="numeric"
            />

            <TouchableOpacity 
              style={styles.createButton}
              onPress={async () => {
                if (!testListingId || !testBuyerId || !testOfferPrice) {
                  Alert.alert('Error', 'Please fill in all fields');
                  return;
                }

                setIsCreatingOffer(true);
                try {
                  // Create the offer data
                  const offerData = {
                    listing_id: testListingId,
                    buyer_id: testBuyerId,
                    offer_price: parseFloat(testOfferPrice),
                    status: 'pending'
                  };

                  // Call the createOffer function from supabase.ts
                  const { createOffer } = await import('@/lib/supabase');
                  await createOffer(offerData);
                  
                  Alert.alert(
                    'Success', 
                    'Test offer created successfully!',
                    [{ text: 'OK', onPress: () => {
                      setShowTestOfferModal(false);
                      // Refresh offers
                      if (user) {
                        getPendingOffers(user.id).then((offers: PendingOffer[]) => {
                          setPendingOffers(offers || []);
                          setActiveTab('offers');
                        });
                      }
                    }}]
                  );
                } catch (error) {
                  console.error('Error creating test offer:', error);
                  Alert.alert('Error', 'Failed to create test offer. Check console for details.');
                } finally {
                  setIsCreatingOffer(false);
                }
              }}
              disabled={isCreatingOffer}
            >
              {isCreatingOffer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Test Offer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  listWrapper: {
    flex: 1,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  offersContainer: {
    paddingHorizontal: 16,
  },
  offerWrapper: {
    marginTop: 16,
  },
  offerItemContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  actionIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  acceptIndicator: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    right: 0,
  },
  declineIndicator: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    left: 0,
  },
  actionText: {
    marginTop: 4,
    fontWeight: 'bold',
  },
  offerItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
  },
  offerImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  offerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  offerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  offerPrice: {
    fontWeight: 'bold',
    color: '#007AFF',
  },
  buyerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  offerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: 'bold',
  },
  offerTime: {
    fontSize: 12,
    color: '#999',
  },
  chatsContainer: {
    paddingHorizontal: 16,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatImageContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  chatImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  sellerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  userRole: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  debugOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    padding: 10,
    zIndex: 9999,
    maxHeight: 200,
  },
  debugHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  debugTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
  },
  // Debug Panel Styles
  debugPanel: {
    margin: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  debugPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  debugPanelTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  debugPanelToggle: {
    color: '#007AFF',
    fontSize: 14,
  },
  debugPanelContent: {
    padding: 10,
  },
  debugPanelLabel: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  debugPanelValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  debugPanelScrollView: {
    maxHeight: 200,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  debugPanelCode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
  },
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
