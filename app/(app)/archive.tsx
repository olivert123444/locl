import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getArchivedListings, removeFromArchive } from '@/lib/supabase';

// Define the type for archived listings
interface ArchivedListing {
  id: string;
  archiveId: string;
  title: string;
  price: number;
  description: string;
  image: string;
  seller: string;
  seller_id: string;
  seller_avatar?: string;
  archivedAt: string;
  archivedAtFormatted: string;
  status: string;
}

export default function ArchiveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [archivedListings, setArchivedListings] = useState<ArchivedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch archived listings
  const fetchArchivedListings = useCallback(async () => {
    if (!user) return;
    
    try {
      const listings = await getArchivedListings(user.id);
      setArchivedListings(listings);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching archived listings:', err);
      setError('Failed to load your archived items. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  // Load archived listings on mount
  useEffect(() => {
    fetchArchivedListings();
  }, [fetchArchivedListings]);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchArchivedListings();
  }, [fetchArchivedListings]);

  // Remove item from archive
  const handleRemoveFromArchive = useCallback((listingId: string) => {
    if (!user) return;
    
    Alert.alert(
      'Remove from Archive',
      'Are you sure you want to remove this item from your archive?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await removeFromArchive(user.id, listingId);
              // Update the local state by filtering out the removed item
              setArchivedListings(prev => prev.filter(item => item.id !== listingId));
            } catch (err: any) {
              console.error('Error removing from archive:', err);
              Alert.alert('Error', 'Failed to remove item from archive. Please try again.');
            } finally {
              setIsLoading(false);
            }
          } 
        }
      ]
    );
  }, [user]);

  // Render an archived item
  const renderArchivedItem = ({ item }: { item: ArchivedListing }) => (
    <TouchableOpacity 
      style={styles.likedItem}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <Image 
        source={{ uri: item.image }} 
        style={styles.itemImage} 
        defaultSource={{ uri: 'https://via.placeholder.com/300x300?text=No+Image' }}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemSeller}>{item.seller}</Text>
        <Text style={styles.itemTime}>{item.archivedAtFormatted}</Text>
      </View>
      <TouchableOpacity 
        style={styles.itemAction}
        onPress={() => handleRemoveFromArchive(item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <Text style={styles.headerTitle}>Archive</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleRefresh}
        >
          <Ionicons name="refresh-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading && !isRefreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading your archived items...</Text>
        </View>
      )}

      {/* Error Message */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Archived Items List */}
      {!isLoading && !error && (
        <FlatList
          data={archivedListings}
          renderItem={renderArchivedItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#6C5CE7']}
              tintColor="#6C5CE7"
            />
          }
          ListHeaderComponent={
            archivedListings.length > 0 ? (
              <Text style={styles.sectionTitle}>Items You've Swiped Right On</Text>
            ) : null
          }
          ListEmptyComponent={
            !isLoading && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="archive-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No archived items yet</Text>
                <Text style={styles.emptySubtext}>
                  Items you swipe right on will appear here
                </Text>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => router.push('/(app)/nearby')}
                >
                  <Text style={styles.browseButtonText}>Browse Nearby Items</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Bottom tab bar has been moved to the app layout */}
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  likedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6C5CE7',
    marginBottom: 4,
  },
  itemSeller: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
  },
  itemAction: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    flex: 1,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20, // Add extra padding for iPhone X+ devices
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#8E8E93',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: '#6C5CE7',
  },
  activeTabText: {
    color: '#6C5CE7',
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
