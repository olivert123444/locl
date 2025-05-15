import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  ScrollView,
  Animated,
  PanResponder,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Mock data for testing
const mockOffers = [
  {
    id: '1',
    listing_id: 'listing1',
    buyer_id: 'buyer1',
    offer_price: 50,
    status: 'pending',
    created_at: new Date().toISOString(),
    listings: {
      title: 'Test Product 1',
      price: 60,
      images: ['https://via.placeholder.com/150']
    },
    buyer_profile: {
      full_name: 'Test Buyer 1',
      avatar_url: 'https://via.placeholder.com/50'
    }
  },
  {
    id: '2',
    listing_id: 'listing2',
    buyer_id: 'buyer2',
    offer_price: 75,
    status: 'pending',
    created_at: new Date().toISOString(),
    listings: {
      title: 'Test Product 2',
      price: 100,
      images: ['https://via.placeholder.com/150']
    },
    buyer_profile: {
      full_name: 'Test Buyer 2',
      avatar_url: 'https://via.placeholder.com/50'
    }
  }
];

export default function TestOffersScreen() {
  const router = useRouter();
  const [pendingOffers, setPendingOffers] = useState(mockOffers);
  
  // For swipe animation
  const swipeAnimMap = useRef<Map<string, Animated.ValueXY>>(new Map());
  const swipeActionMap = useRef<Map<string, boolean>>(new Map());
  
  // Initialize animation values
  React.useEffect(() => {
    pendingOffers.forEach(offer => {
      if (!swipeAnimMap.current.has(offer.id)) {
        swipeAnimMap.current.set(offer.id, new Animated.ValueXY());
      }
    });
  }, [pendingOffers]);
  
  // Handle offer response (accept/decline)
  const handleOfferResponse = (offerId: string, action: 'accept' | 'decline') => {
    // Remove the offer from the list
    setPendingOffers(prevOffers => prevOffers.filter(offer => offer.id !== offerId));
    
    // Show success message
    Alert.alert(
      action === 'accept' ? 'Offer Accepted' : 'Offer Declined',
      action === 'accept' 
        ? 'You have accepted the offer. A message has been sent to the buyer.'
        : 'You have declined the offer.',
      [{ text: 'OK' }]
    );
  };

  // Create a pan responder for each offer item
  const createPanResponder = (offerId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal swiping
        const anim = swipeAnimMap.current.get(offerId);
        if (anim) {
          anim.setValue({ x: gestureState.dx, y: 0 });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const anim = swipeAnimMap.current.get(offerId);
        if (!anim) return;
        
        const SWIPE_THRESHOLD = 120; // Minimum distance to trigger swipe action
        
        // If swiped far enough to the right (accept)
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Mark as being processed to prevent double actions
          if (swipeActionMap.current.get(offerId)) return;
          swipeActionMap.current.set(offerId, true);
          
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
          if (swipeActionMap.current.get(offerId)) return;
          swipeActionMap.current.set(offerId, true);
          
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
  const renderOfferItem = ({ item }: { item: any }) => {
    const panResponder = createPanResponder(item.id);
    const anim = swipeAnimMap.current.get(item.id) || new Animated.ValueXY();
    
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
    
    // Get image URL from the listing
    const imageUrl = item.listings?.images && item.listings.images.length > 0
      ? item.listings.images[0]
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
              <Text style={styles.productName} numberOfLines={1}>{item.listings?.title || 'Unknown Product'}</Text>
              <Text style={styles.offerPrice}>${item.offer_price}</Text>
            </View>
            <Text style={styles.buyerName}>{item.buyer_profile?.full_name || 'Unknown Buyer'}</Text>
            <View style={styles.offerDetails}>
              <Text style={styles.offerText}>New Offer</Text>
              <Text style={styles.offerTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Offers</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.listWrapper}>
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Test Offers</Text>
            <Text style={styles.sectionSubtitle}>Swipe right to accept, left to decline</Text>
          </View>
          
          <View style={styles.offersContainer}>
            {pendingOffers.map(offer => (
              <View key={offer.id} style={styles.offerWrapper}>
                {renderOfferItem({ item: offer })}
              </View>
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
    backgroundColor: '#fff',
  },
  listWrapper: {
    flex: 1,
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
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  offersContainer: {
    paddingHorizontal: 16,
  },
  offerWrapper: {
    marginVertical: 8,
  },
  offerItemContainer: {
    position: 'relative',
    height: 100,
  },
  actionIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  acceptIndicator: {
    right: 0,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  declineIndicator: {
    left: 0,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  actionText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  offerItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 2,
  },
  offerImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  offerImage: {
    width: '100%',
    height: '100%',
  },
  offerInfo: {
    flex: 1,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  offerPrice: {
    fontWeight: 'bold',
    color: '#34C759',
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
    color: '#FF9500',
    fontWeight: 'bold',
  },
  offerTime: {
    fontSize: 12,
    color: '#999',
  },
});
