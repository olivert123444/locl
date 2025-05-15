import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Dimensions, 
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Sample profile data
const sampleProfile = {
  id: '1',
  name: 'Marjo',
  age: 36,
  bio: 'Here to date',
  images: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MTJ8fHByb2ZpbGUlMjBwaWN0dXJlfGVufDB8fDB8fA%3D%3D&auto=format&fit=crop&w=800&q=60'],
  verified: true
};

export default function SwipeScreen() {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('archive');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Ionicons name="heart" size={32} color="#6C5CE7" />
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="options-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content - Profile Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Image
            source={{ uri: sampleProfile.images[0] }}
            style={styles.cardImage}
          />
          <View style={styles.cardOverlay}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{sampleProfile.name}, {sampleProfile.age}</Text>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>{sampleProfile.bio}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.skipButton]}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]}>
          <Ionicons name="heart" size={28} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('nearby');
            router.push('/(app)/nearby');
          }}
        >
          <Ionicons 
            name={currentTab === 'nearby' ? "location" : "location-outline"} 
            size={24} 
            color={currentTab === 'nearby' ? "#6C5CE7" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText, 
            currentTab === 'nearby' && styles.activeTabText
          ]}>Nearby</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('encounters');
            router.push('/(app)/encounters');
          }}
        >
          <Ionicons 
            name={currentTab === 'encounters' ? "albums" : "albums-outline"} 
            size={24} 
            color={currentTab === 'encounters' ? "#6C5CE7" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText, 
            currentTab === 'encounters' && styles.activeTabText
          ]}>Encounters</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('archive');
            router.push('/(app)/archive');
          }}
        >
          <Ionicons 
            name={currentTab === 'archive' ? "archive" : "archive-outline"} 
            size={24} 
            color={currentTab === 'archive' ? "#6C5CE7" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText, 
            currentTab === 'archive' && styles.activeTabText
          ]}>Archive</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('chats');
            router.push('/(app)/messages');
          }}
        >
          <Ionicons 
            name={currentTab === 'chats' ? "chatbubble" : "chatbubble-outline"} 
            size={24} 
            color={currentTab === 'chats' ? "#6C5CE7" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText, 
            currentTab === 'chats' && styles.activeTabText
          ]}>Chats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => {
            setCurrentTab('profile');
            router.push('/(app)/profile');
          }}
        >
          <Ionicons 
            name={currentTab === 'profile' ? "person" : "person-outline"} 
            size={24} 
            color={currentTab === 'profile' ? "#6C5CE7" : "#8E8E93"} 
          />
          <Text style={[
            styles.tabText, 
            currentTab === 'profile' && styles.activeTabText
          ]}>Profile</Text>
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
  },
  headerButton: {
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: width - 40,
    height: height * 0.6,
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
  verifiedBadge: {
    position: 'absolute',
    top: -30,
    left: 20,
    backgroundColor: '#6C5CE7',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  tagContainer: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  skipButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  likeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
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
  activeTabText: {
    color: '#6C5CE7',
  },
});
