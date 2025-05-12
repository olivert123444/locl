import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  ActivityIndicator,
  Alert,
  Switch,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getUserProfile, deleteListing } from '@/lib/supabase';
import { getCurrentLocation } from '@/lib/locationService';
import AvatarUpload from '@/components/AvatarUpload';
import BottomTabBar from '@/components/BottomTabBar';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('listings');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [locationVisible, setLocationVisible] = useState(true);
  const [devToolsTapCount, setDevToolsTapCount] = useState(0);
  const [showDevTools, setShowDevTools] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserListings();
      fetchSavedItems();
      updateUserLocation();
    }
  }, [user]);
  
  // Update user's location in their profile
  const updateUserLocation = async () => {
    if (!user) return;
    
    try {
      // Get current location
      const locationData = await getCurrentLocation();
      
      if (locationData) {
        console.log('Got current location for profile:', locationData);
        
        // Update the user's profile with the current location
        const { error } = await supabase
          .from('users')
          .update({ location: locationData })
          .eq('id', user.id);
          
        if (error) {
          console.error('Error updating user location:', error);
        } else {
          console.log('Updated user profile with current location');
          // Update local profile state
          setProfile((prev: any) => ({
            ...prev,
            location: locationData
          }));
        }
      }
    } catch (error) {
      console.error('Error getting or updating location:', error);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const profileData = await getUserProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserListings = async () => {
    setIsLoading(true);
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Set listings from data
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSavedItems = async () => {
    try {
      if (!user) return;
      
      // Fetch archived listings from the database
      const { data, error } = await supabase
        .from('archive')
        .select(`
          id,
          listing_id,
          listings!inner(id, title, description, price, category, images, seller_id, status, created_at)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Transform the data to get the listings
      const archivedListings = data?.map(item => ({
        ...item.listings,
        archive_id: item.id
      })) || [];
      
      setSavedItems(archivedListings);
    } catch (error) {
      console.error('Error fetching saved items:', error);
      setSavedItems([]);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      setSettingsModalVisible(false); // Close the settings modal first
      await signOut();
      console.log('User signed out successfully');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleViewListing = (listingId: string) => {
    router.push({
      pathname: '/listing/[id]',
      params: { id: listingId }
    });
  };
  
  const toggleSettingsModal = () => {
    setSettingsModalVisible(!settingsModalVisible);
  };
  
  // This is a duplicate function that was added by mistake
  
  const handleCreateListing = () => {
    router.push('/create-listing');
  };
  
  // Handle taps on profile header to activate dev tools
  const handleHeaderTap = () => {
    setDevToolsTapCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 7) {
        setShowDevTools(true);
        return 0; // Reset counter
      }
      return newCount;
    });
  };
  
  // Navigate to dev tools
  const navigateToDevTools = () => {
    router.push('/dev-tools');
  };
  
  // Helper function to format location display in a user-friendly way
  const getLocationDisplay = (location: any): string => {
    if (!location) return 'No location set';
    
    try {
      // If location is a string, try to parse it
      const locationObj = typeof location === 'string' ? JSON.parse(location) : location;
      
      // First priority: use the city name if available
      // This is the most user-friendly option and comes from our geocoding service
      if (locationObj.city) {
        // If we have a region/state and it's not already part of the city name
        if (locationObj.region && !locationObj.city.includes(locationObj.region)) {
          return `${locationObj.city}, ${locationObj.region}`;
        }
        return locationObj.city;
      }
      
      // Second priority: use the full address if available
      if (locationObj.address) return locationObj.address;
      
      // Third priority: try to build from components
      const region = locationObj.region;
      const country = locationObj.country;
      
      if (region) {
        return country ? `${region}, ${country}` : region;
      }
      
      if (country) {
        return country;
      }
      
      // Last resort: if we have coordinates but no readable location
      // Instead of showing raw coordinates, use a friendly message
      if (locationObj.latitude && locationObj.longitude) {
        return 'Nearby Location';
      }
      
      return 'Location available';
    } catch (error) {
      console.error('Error parsing location:', error);
      return 'Location available'; // More user-friendly than 'Location format error'
    }
  };
  
  const handleDeleteListing = async (listingId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!user) {
                Alert.alert('Error', 'You must be logged in to delete listings.');
                return;
              }
              
              // Use the new deleteListing function from supabase.ts
              const result = await deleteListing(listingId, user.id);
              
              // Show success message
              Alert.alert('Success', 'Listing has been deleted successfully.');
              
              // Refresh listings
              fetchUserListings();
            } catch (error: any) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', error.message || 'Failed to delete listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle avatar update from the AvatarUpload component
  const handleAvatarUpdated = (newUrl: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: newUrl });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Profile Header */}
        <TouchableOpacity style={styles.header} onPress={handleHeaderTap} activeOpacity={1}>
          <View style={styles.profileInfoRow}>
            {/* Using our new AvatarUpload component */}
            {user && (
              <AvatarUpload
                userId={user.id}
                currentAvatarUrl={profile?.avatar_url}
                size={80}
                onAvatarUpdated={handleAvatarUpdated}
              />
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
              <Text style={styles.userLocation}>
                <Ionicons name="location-outline" size={14} color="#666" />{' '}
                {getLocationDisplay(profile?.location)}
              </Text>
              <Text style={styles.userJoined}>
                <Ionicons name="calendar-outline" size={14} color="#666" />{' '}
                Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
              </Text>
            </View>
            <TouchableOpacity style={styles.settingsButton} onPress={toggleSettingsModal}>
              <Ionicons name="settings-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Ionicons name="person-outline" size={16} color="#007AFF" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createListingButton} onPress={handleCreateListing}>
              <Ionicons name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.createListingButtonText}>Create Listing</Text>
            </TouchableOpacity>
          </View>
          
          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{listings.length}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Sold</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{savedItems.length}</Text>
              <Text style={styles.statLabel}>Saved</Text>
            </View>
          </View>
          
          {/* Bio Section */}
          <View style={styles.aboutContainer}>
            <Text style={styles.aboutTitle}>About Me</Text>
            <Text style={styles.aboutText}>{profile?.bio || 'No bio yet. Tap Edit Profile to add one!'}</Text>
          </View>
          
          {showDevTools && (
            <TouchableOpacity style={styles.devToolsButton} onPress={navigateToDevTools}>
              <Ionicons name="code-outline" size={16} color="#FFFFFF" />
              <Text style={styles.devToolsButtonText}>Dev Tools</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'listings' && styles.activeTab]} 
            onPress={() => setActiveTab('listings')}
          >
            <Text style={[styles.tabText, activeTab === 'listings' && styles.activeTabText]}>My Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <View style={styles.content}>
            {activeTab === 'listings' && (
              <>
                {listings.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="basket-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>You don't have any listings yet</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={handleCreateListing}>
                      <Text style={styles.emptyButtonText}>Create Listing</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.listingsContainer}>
                    {listings.map((listing) => (
                      <TouchableOpacity 
                        key={listing.id} 
                        style={styles.listingCard}
                        onPress={() => handleViewListing(listing.id)}
                      >
                        <Image 
                          source={
                            Array.isArray(listing.images) && listing.images.length > 0 
                              ? { uri: listing.images[0] } 
                              : require('../../assets/images/icon.png')
                          } 
                          style={styles.listingImage} 
                        />
                        <View style={styles.listingDetails}>
                          <Text style={styles.listingTitle} numberOfLines={1}>{listing.title}</Text>
                          <Text style={styles.listingPrice}>${listing.price}</Text>
                          <View style={styles.listingMetaRow}>
                            <Text style={styles.listingCategory}>{listing.category}</Text>
                            <Text style={[
                              styles.listingStatus, 
                              listing.status === 'active' ? styles.statusActive : 
                              listing.status === 'sold' ? styles.statusSold : 
                              styles.statusArchived
                            ]}>
                              {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteListing(listing.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {activeTab === 'saved' && (
              <>
                {savedItems.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="heart-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>You haven't saved any items yet</Text>
                    <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/')}>
                      <Text style={styles.emptyButtonText}>Browse Items</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.listingsContainer}>
                    {savedItems.map((item) => (
                      <TouchableOpacity 
                        key={item.id} 
                        style={styles.listingCard}
                        onPress={() => handleViewListing(item.id)}
                      >
                        <Image 
                          source={item.main_image_url ? { uri: item.main_image_url } : require('../../assets/images/icon.png')} 
                          style={styles.listingImage} 
                        />
                        <View style={styles.listingDetails}>
                          <Text style={styles.listingTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.listingPrice}>${item.price}</Text>
                          <View style={styles.listingMetaRow}>
                            <Text style={styles.listingCategory}>{item.category}</Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.favoriteButton}>
                          <Ionicons name="heart" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={toggleSettingsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={toggleSettingsModal}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications-outline" size={24} color="#007AFF" />
                <Text style={styles.settingText}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon-outline" size={24} color="#007AFF" />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="location-outline" size={24} color="#007AFF" />
                <Text style={styles.settingText}>Show Location</Text>
              </View>
              <Switch
                value={locationVisible}
                onValueChange={setLocationVisible}
                trackColor={{ false: '#ccc', true: '#007AFF' }}
              />
            </View>
            
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  userJoined: {
    fontSize: 14,
    color: '#666',
  },
  settingsButton: {
    padding: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  editProfileText: {
    marginLeft: 5,
    color: '#007AFF',
    fontWeight: '600',
  },
  createListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  createListingButtonText: {
    marginLeft: 5,
    color: '#fff',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ddd',
  },
  aboutContainer: {
    marginTop: 20,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aboutText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  loader: {
    marginTop: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listingsContainer: {
    marginBottom: 20,
  },
  listingCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  listingImage: {
    width: 100,
    height: 100,
  },
  listingDetails: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  listingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listingCategory: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  listingStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusActive: {
    backgroundColor: '#e6f7ed',
    color: '#34c759',
  },
  statusSold: {
    backgroundColor: '#e6e6e6',
    color: '#8e8e93',
  },
  statusArchived: {
    backgroundColor: '#fff3e6',
    color: '#ff9500',
  },
  deleteButton: {
    padding: 15,
    justifyContent: 'center',
  },
  favoriteButton: {
    padding: 15,
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 10,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  devToolsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 15,
    justifyContent: 'center',
  },
  devToolsButtonText: {
    marginLeft: 5,
    color: '#fff',
    fontWeight: '600',
  },
});
