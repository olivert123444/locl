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
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getUserProfile } from '@/lib/supabase';

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

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserListings();
      fetchSavedItems();
    }
  }, [user]);

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
      
      // Add placeholder listings for demo if none exist
      if (!data || data.length === 0) {
        const dummyListings = [
          {
            id: 'dummy-1',
            title: 'Vintage Record Player',
            description: 'Barely used vintage record player in excellent condition',
            price: 120,
            category: 'Electronics',
            main_image_url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d',
            seller_id: user.id,
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: 'dummy-2',
            title: 'Mountain Bike',
            description: 'Great condition mountain bike, perfect for trails',
            price: 250,
            category: 'Sports',
            main_image_url: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7',
            seller_id: user.id,
            status: 'active',
            created_at: new Date().toISOString()
          }
        ];
        setListings(dummyListings);
      } else {
        setListings(data);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchSavedItems = async () => {
    try {
      if (!user) return;
      
      // In a real app, we would fetch saved items from the database
      // For now, we'll use dummy data
      const dummySavedItems = [
        {
          id: 'saved-1',
          title: 'Leather Sofa',
          description: 'Beautiful leather sofa in great condition',
          price: 350,
          category: 'Furniture',
          main_image_url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
          seller_id: 'other-user-1',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 'saved-2',
          title: 'iPhone 12',
          description: 'Like new iPhone 12, 128GB storage',
          price: 450,
          category: 'Electronics',
          main_image_url: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e',
          seller_id: 'other-user-2',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      
      setSavedItems(dummySavedItems);
    } catch (error) {
      console.error('Error fetching saved items:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
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
  
  const handleCreateListing = () => {
    router.push('/create-listing');
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
              // For dummy listings, just filter them out
              if (listingId.startsWith('dummy-')) {
                setListings(listings.filter(listing => listing.id !== listingId));
                return;
              }
              
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', listingId);
                
              if (error) throw error;
              
              // Refresh listings
              fetchUserListings();
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileInfoRow}>
            <Image 
              source={profile?.avatar_url ? { uri: profile.avatar_url } : require('../../assets/images/adaptive-icon.png')} 
              style={styles.avatar} 
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
              <Text style={styles.userLocation}>
                <Ionicons name="location-outline" size={14} color="#666" />{' '}
                {profile?.location?.city || 'No location set'}
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
        </View>

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
                          source={listing.main_image_url ? { uri: listing.main_image_url } : require('../../assets/images/icon.png')} 
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
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
});
