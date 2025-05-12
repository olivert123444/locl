import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  full_name: string;
}

interface Listing {
  id: string;
  title: string;
  seller_id: string;
}

export default function TestUtilsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchListings();
  }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchListings = async () => {
    setIsLoadingListings(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, seller_id')
        .limit(10);

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to fetch listings');
    } finally {
      setIsLoadingListings(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    // In a real app, you would use Clipboard.setString(text)
    // For this example, we'll just show an alert
    Alert.alert('Copied', `${type} ID: ${text} copied to clipboard`);
  };

  const navigateToCreateOffer = () => {
    router.push('/(app)/create-test-offer');
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => copyToClipboard(item.id, 'User')}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.full_name}</Text>
        <Text style={styles.itemSubtitle}>{item.id}</Text>
      </View>
      <Ionicons name="copy-outline" size={20} color="#007AFF" />
    </TouchableOpacity>
  );

  const renderListingItem = ({ item }: { item: Listing }) => (
    <TouchableOpacity 
      style={styles.item}
      onPress={() => copyToClipboard(item.id, 'Listing')}
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.id}</Text>
        <Text style={styles.itemSubtitle}>Seller: {item.seller_id}</Text>
      </View>
      <Ionicons name="copy-outline" size={20} color="#007AFF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Utilities</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={navigateToCreateOffer}
        >
          <Text style={styles.createButtonText}>Create Test Offer</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Users</Text>
          {isLoadingUsers ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={item => item.id}
              style={styles.list}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Listings</Text>
          {isLoadingListings ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <FlatList
              data={listings}
              renderItem={renderListingItem}
              keyExtractor={item => item.id}
              style={styles.list}
            />
          )}
        </View>
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
    flex: 1,
    padding: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  list: {
    maxHeight: 200,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
