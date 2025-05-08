import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  ActivityIndicator
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getNearbyListings, createOffer } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Define product type
interface Product {
  id: string;
  title: string;
  price: number;
  distance: number;
  image: string;
  seller: string;
  description: string;
}

// Sample product data
const sampleProducts: Product[] = [
  {
    id: '1',
    title: 'Vintage Record Player',
    price: 120,
    distance: 2.5, // km
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d',
    seller: 'Maria Garcia',
    description: 'Fully functional vintage record player from the 1970s. Recently serviced and in excellent working condition.',
  },
  {
    id: '2',
    title: 'Mountain Bike - Trek 3500',
    price: 250,
    distance: 4.2, // km
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7',
    seller: 'John Smith',
    description: 'Barely used mountain bike, perfect for trails. Features 21 speeds, front suspension, and disc brakes.',
  },
  {
    id: '3',
    title: 'iPhone 12 Pro - 128GB',
    price: 400,
    distance: 1.8, // km
    image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e',
    seller: 'Alex Johnson',
    description: 'iPhone 12 Pro in great condition, includes charger and original box. No scratches or dents.',
  },
  {
    id: '4',
    title: 'Handmade Ceramic Vase Set',
    price: 65,
    distance: 3.5, // km
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c',
    seller: 'Emma Wilson',
    description: 'Set of 3 handmade ceramic vases in varying sizes. Each piece is unique with a beautiful blue glaze finish.',
  },
  {
    id: '5',
    title: 'Leather Messenger Bag',
    price: 85,
    distance: 5.1, // km
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    seller: 'David Kim',
    description: 'Genuine leather messenger bag, perfect for laptops up to 15". Features multiple compartments and adjustable strap.',
  },
];

// Distance options
const distanceOptions = [1, 5, 10, 20, 50];

// Function to add a new match to chat matches
const addMatchToChats = (product: Product, offerAmount: number) => {
  // This would normally be a backend API call
  // For now, we're simulating it by adding to a global variable
  // that the chat screen will access
  
  // In a real app, this would be handled by a state management solution or backend
  if (typeof window !== 'undefined') {
    // Create a new chat match from the product
    const newMatch = {
      id: Date.now().toString(),
      productName: product.title,
      price: offerAmount,
      productImage: product.image,
      sellerName: product.seller,
      lastMessage: `I'm interested in your ${product.title}. Would you accept $${offerAmount}?`,
      time: 'Just now',
      unread: 1
    };
    
    // Add to global chatMatches if it exists
    if (!(window as any).globalChatMatches) {
      (window as any).globalChatMatches = [];
    }
    
    (window as any).globalChatMatches.unshift(newMatch);
    
    // Set a flag to indicate new matches
    (window as any).hasNewMatches = true;
  }
};

export default function NearbyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchDistance, setSearchDistance] = useState(5); // Default 5 km
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const swiperRef = useRef(null);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const sliderWidth = useRef(0);
  const sliderPosition = useRef(new Animated.Value(0)).current;
  
  // Fetch listings based on search distance
  const fetchListings = useCallback(async (distance?: number) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const distanceToUse = distance !== undefined ? distance : searchDistance;
      const listings = await getNearbyListings(user.id, distanceToUse);
      
      // Convert Supabase listings to Product format
      const formattedProducts: Product[] = listings.map(listing => ({
        id: listing.id,
        title: listing.title,
        price: listing.price,
        distance: listing.distance || 0,
        image: listing.main_image_url || 'https://images.unsplash.com/photo-1627843563095-f6e94676cfe0',
        seller: listing.seller,
        description: listing.description || ''
      }));
      
      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error fetching listings:', error);
      // Fallback to sample products if there's an error
      setProducts(sampleProducts.filter(p => p.distance <= searchDistance));
    } finally {
      setIsLoading(false);
    }
  }, [user, searchDistance]);
  
  // Fetch listings when component mounts or search distance changes
  useEffect(() => {
    fetchListings();
  }, [fetchListings, searchDistance]);
  
  // Calculate the current position based on the search distance
  useEffect(() => {
    const index = distanceOptions.indexOf(searchDistance);
    const position = (index / (distanceOptions.length - 1)) * 100;
    sliderPosition.setValue(position);
  }, [searchDistance]);
  
  // Create pan responder for slider thumb
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Store the current position when the user starts dragging
        // Using a safer approach with a state variable to track the current value
        let currentValue = 0;
        // Create a temporary listener to get the current value
        const id = sliderPosition.addListener(({ value }) => {
          currentValue = value;
          sliderPosition.removeListener(id);
        });
        sliderPosition.setOffset(currentValue);
        sliderPosition.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Calculate the new position based on the drag distance
        const trackWidth = sliderWidth.current;
        if (trackWidth <= 0) return;
        
        // Convert gesture movement to percentage of slider width
        const newPosition = (gestureState.dx / trackWidth) * 100;
        
        // Constrain the position between 0 and 100
        // Use state variables to track values instead of accessing private properties
        let currentOffset = 0;
        let currentValue = 0;
        
        // Create a temporary listener to get the current value
        const id = sliderPosition.addListener(({ value }) => {
          currentValue = value;
          sliderPosition.removeListener(id);
        });
        
        // Calculate the constrained position based on the current value and offset
        const constrainedPosition = Math.max(0, Math.min(100, currentOffset + newPosition));
        sliderPosition.setValue(constrainedPosition - currentOffset);
      },
      onPanResponderRelease: () => {
        // When the user releases, find the closest distance option
        sliderPosition.flattenOffset();
        
        // Calculate the position as a percentage (0-100)
        let position = 0;
        // Create a temporary listener to get the current value
        const id = sliderPosition.addListener(({ value }) => {
          position = value;
          sliderPosition.removeListener(id);
          
          // Find the closest distance option
          const segmentWidth = 100 / (distanceOptions.length - 1);
          const closestIndex = Math.round(position / segmentWidth);
          const constrainedIndex = Math.max(0, Math.min(distanceOptions.length - 1, closestIndex));
          
          // Update the search distance and animate the slider to the exact position
          const newDistance = distanceOptions[constrainedIndex];
          if (newDistance !== searchDistance) {
            setSearchDistance(newDistance);
            // Refresh listings when distance changes
            fetchListings(newDistance);
          }
          
          Animated.timing(sliderPosition, {
            toValue: constrainedIndex * segmentWidth,
            duration: 150,
            useNativeDriver: false,
          }).start();
        });
        // Note: Animation to the exact position is now handled inside the callback above
      },
    })
  ).current;

  // Animation for the swoosh effect
  const startAnimation = () => {
    setShowAnimation(true);
    animatedValue.setValue(0);
    
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true
    }).start(() => {
      setShowAnimation(false);
    });
    
    // Note: In a real app, we would play a sound effect here
    console.log('Swoosh sound would play here');
  };

  const handleSwipeRight = (cardIndex: number) => {
    // Use real products if available, otherwise fall back to sample products
    const productsToUse = products.length > 0 ? products : sampleProducts;
    const product = productsToUse[cardIndex];
    setCurrentProduct(product);
    setOfferAmount(product.price.toString());
    setOfferModalVisible(true);
  };

  const handleSwipeLeft = (cardIndex: number) => {
    // Use real products if available, otherwise fall back to sample products
    const productsToUse = products.length > 0 ? products : sampleProducts;
    console.log('Skipped product:', productsToUse[cardIndex].title);
  };

  const handleSendOffer = async () => {
    if (!currentProduct || !user) return;
    
    const amount = parseFloat(offerAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid offer amount.');
      return;
    }
    
    // Close the modal first
    setOfferModalVisible(false);
    
    // Start the animation and play sound
    startAnimation();
    
    try {
      // Create a real offer in Supabase
      const offerData = {
        listing_id: currentProduct.id,
        buyer_id: user.id,
        offer_price: amount, // Using offer_price to match the database schema
        message: `I'm interested in your ${currentProduct.title}. Would you accept $${amount}?`,
        status: 'pending'
        // No need to set created_at, the database will handle it
      };
      
      await createOffer(offerData);
      
      // Add the match to chats (keep the local functionality for now)
      addMatchToChats(currentProduct, amount);
      
      // Show a brief notification
      setTimeout(() => {
        Alert.alert(
          'Offer Sent!',
          `Your offer of $${amount} for ${currentProduct.title} has been sent to ${currentProduct.seller}.\n\nYou have a new match! Check your chats.`
        );
      }, 1200); // Wait for animation to finish
    } catch (error) {
      console.error('Error creating offer:', error);
      Alert.alert('Error', 'Failed to send offer. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Swoosh Animation */}
      {showAnimation && (
        <Animated.View
          style={[
            styles.swooshAnimation,
            {
              transform: [
                {
                  translateX: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, width + 100]
                  })
                }
              ],
              opacity: animatedValue.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [1, 0.8, 0]
              })
            }
          ]}
        >
          <Ionicons name="mail" size={32} color="#fff" />
        </Animated.View>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nearby</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="search" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content - Product Cards */}
      <View style={styles.cardContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Finding items near you...</Text>
          </View>
        ) : products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No items found within {searchDistance}km</Text>
            <Text style={styles.emptySubtext}>Try increasing your search distance</Text>
          </View>
        ) : (
          <Swiper
            ref={swiperRef}
            cards={products.length > 0 ? products : sampleProducts}
            renderCard={(product) => (
            <View style={styles.card}>
              <Image
                source={{ uri: product.image }}
                style={styles.cardImage}
              />
              <View style={styles.cardOverlay}>
                <View style={styles.distanceBadge}>
                  <Ionicons name="location" size={14} color="#fff" />
                  <Text style={styles.distanceText}>{product.distance} km</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{product.title}</Text>
                  <Text style={styles.cardPrice}>${product.price}</Text>
                  <View style={styles.sellerContainer}>
                    <Text style={styles.sellerText}>Seller: {product.seller}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          onSwipedRight={handleSwipeRight}
          onSwipedLeft={handleSwipeLeft}
          backgroundColor={'transparent'}
          cardVerticalMargin={20}
          stackSize={3}
          stackSeparation={15}
          animateOverlayLabelsOpacity
          animateCardOpacity
          disableBottomSwipe={true}
          disableTopSwipe={true}
          overlayLabels={{
            left: {
              title: 'SKIP',
              style: {
                label: {
                  backgroundColor: '#FF3B30',
                  color: 'white',
                  fontSize: 16,
                  borderRadius: 10,
                  padding: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: -30,
                },
              },
            },
            right: {
              title: 'OFFER',
              style: {
                label: {
                  backgroundColor: '#34C759',
                  color: 'white',
                  fontSize: 16,
                  borderRadius: 10,
                  padding: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: 30,
                },
              },
            },
          }}
        />
        )}
      </View>
      
      {/* Distance Slider (below the image) */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Search Distance: {searchDistance} km</Text>
        <View 
          style={styles.sliderTrack}
          onLayout={(event) => {
            // Store the width of the slider track for calculations
            sliderWidth.current = event.nativeEvent.layout.width;
          }}
        >
          {/* Slider markers */}
          {distanceOptions.map((option, index) => (
            <TouchableOpacity 
              key={option}
              style={[
                styles.sliderMarker,
                { left: `${(index / (distanceOptions.length - 1)) * 100}%` }
              ]}
              onPress={() => setSearchDistance(option)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            />
          ))}
          
          {/* Slider fill - animated based on position */}
          <Animated.View 
            style={[
              styles.sliderFill, 
              { 
                width: sliderPosition.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp'
                })
              }
            ]} 
          />
          
          {/* Slider thumb - draggable with pan responder */}
          <Animated.View 
            style={[
              styles.sliderThumb, 
              { 
                left: sliderPosition.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp'
                })
              }
            ]}
            {...panResponder.panHandlers}
          />
        </View>
        
        {/* Distance labels */}
        <View style={styles.sliderLabels}>
          {distanceOptions.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.distanceOption,
                { left: `${(index / (distanceOptions.length - 1)) * 100}%` },
                searchDistance === option && styles.selectedDistance
              ]}
              onPress={() => setSearchDistance(option)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text 
                style={[
                  styles.distanceOptionText,
                  searchDistance === option && styles.selectedDistanceText
                ]}
              >
                {option}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Offer Modal */}
      <Modal
        visible={offerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOfferModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make an Offer</Text>
              <TouchableOpacity onPress={() => setOfferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            {currentProduct && (
              <View style={styles.modalItemInfo}>
                <Image 
                  source={{ uri: currentProduct.image }} 
                  style={styles.modalItemImage} 
                />
                <View style={styles.modalItemDetails}>
                  <Text style={styles.modalItemTitle}>{currentProduct.title}</Text>
                  <Text style={styles.modalItemPrice}>Listed for ${currentProduct.price}</Text>
                  <Text style={styles.modalItemSeller}>Seller: {currentProduct.seller}</Text>
                </View>
              </View>
            )}
            
            <Text style={styles.modalLabel}>Your Offer Amount ($)</Text>
            <TextInput
              style={styles.modalInput}
              value={offerAmount}
              onChangeText={setOfferAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
            />
            
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={handleSendOffer}
            >
              <Text style={styles.modalButtonText}>Send Offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, styles.activeTab]}
          onPress={() => router.push('/(app)/nearby')}
        >
          <Ionicons name="location" size={24} color="#6C5CE7" />
          <Text style={[styles.tabText, styles.activeTabText]}>Nearby</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/likes')}
        >
          <Ionicons name="heart-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Likes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/chats')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Chats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  swooshAnimation: {
    position: 'absolute',
    top: height / 2 - 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: '#6C5CE7',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width - 40,
    height: height * 0.5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  distanceBadge: {
    position: 'absolute',
    top: -30,
    right: 20,
    backgroundColor: '#6C5CE7',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  cardInfo: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  cardPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  sellerContainer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sellerText: {
    color: '#fff',
    fontSize: 14,
  },
  sliderContainer: {
    padding: 16,
    marginBottom: 20,
    position: 'relative',
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 30,
    position: 'relative',
    width: '100%',
  },
  sliderMarker: {
    width: 2,
    height: 10,
    backgroundColor: '#ccc',
    position: 'absolute',
    top: -2,
    marginLeft: -1,
  },
  sliderFill: {
    height: 6,
    backgroundColor: '#6C5CE7',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    position: 'absolute',
    top: -7,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sliderLabels: {
    position: 'relative',
    height: 20,
  },
  distanceOption: {
    position: 'absolute',
    transform: [{ translateX: -15 }],
  },
  selectedDistance: {
    backgroundColor: 'transparent',
  },
  distanceOptionText: {
    color: '#666',
    fontSize: 12,
  },
  selectedDistanceText: {
    color: '#6C5CE7',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalItemInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  modalItemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  modalItemPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalItemSeller: {
    fontSize: 14,
    color: '#6C5CE7',
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#6C5CE7',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  tabText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C5CE7',
  },
  activeTabText: {
    color: '#6C5CE7',
  },
});
