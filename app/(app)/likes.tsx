import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Sample liked items data
const likedItems = [
  {
    id: '1',
    title: 'Vintage Record Player',
    price: 120,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d',
    seller: 'Maria Garcia',
    likedAt: '2 days ago'
  },
  {
    id: '2',
    title: 'Mountain Bike - Trek 3500',
    price: 250,
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7',
    seller: 'John Smith',
    likedAt: '3 days ago'
  },
  {
    id: '3',
    title: 'iPhone 12 Pro - 128GB',
    price: 400,
    image: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e',
    seller: 'Alex Johnson',
    likedAt: '5 days ago'
  },
  {
    id: '4',
    title: 'Handmade Ceramic Vase Set',
    price: 65,
    image: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c',
    seller: 'Emma Wilson',
    likedAt: '1 week ago'
  },
  {
    id: '5',
    title: 'Leather Messenger Bag',
    price: 85,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa',
    seller: 'David Kim',
    likedAt: '1 week ago'
  },
];

export default function LikesScreen() {
  const router = useRouter();

  const renderLikedItem = ({ item }: { item: { id: string; image: string; title?: string; price?: number; seller: string; likedAt: string } }) => (
    <TouchableOpacity 
      style={styles.likedItem}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
        <Text style={styles.itemSeller}>{item.seller}</Text>
        <Text style={styles.itemTime}>{item.likedAt}</Text>
      </View>
      <TouchableOpacity style={styles.itemAction}>
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <Text style={styles.headerTitle}>Likes</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Liked Items List */}
      <FlatList
        data={likedItems}
        renderItem={renderLikedItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Items You've Liked</Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No liked items yet</Text>
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
        }
      />

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/nearby')}
        >
          <Ionicons name="location-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Nearby</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, styles.activeTab]}
          onPress={() => router.push('/(app)/likes')}
        >
          <Ionicons name="heart" size={24} color="#6C5CE7" />
          <Text style={[styles.tabText, styles.activeTabText]}>Likes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/messages')}
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
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
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
    paddingVertical: 40,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
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
