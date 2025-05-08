import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Sample encounters data
const sampleEncounters = [
  {
    id: '1',
    name: 'Sarah',
    age: 28,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZmlsZXxlbnwwfHwwfHw%3D&auto=format&fit=crop&w=500&q=60',
    time: '2 hours ago'
  },
  {
    id: '2',
    name: 'Michael',
    age: 32,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZmlsZSUyMHBpY3R1cmV8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
    time: '3 hours ago'
  },
  {
    id: '3',
    name: 'Jessica',
    age: 26,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NHx8cHJvZmlsZSUyMHBpY3R1cmV8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
    time: '5 hours ago'
  },
  {
    id: '4',
    name: 'David',
    age: 30,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8M3x8cHJvZmlsZSUyMHBpY3R1cmV8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
    time: '1 day ago'
  },
  {
    id: '5',
    name: 'Emily',
    age: 24,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8NXx8cHJvZmlsZSUyMHBpY3R1cmV8ZW58MHx8MHx8&auto=format&fit=crop&w=500&q=60',
    time: '1 day ago'
  },
];

export default function EncountersScreen() {
  const router = useRouter();

  const renderEncounterItem = ({ item }: { item: { id: string; name: string; age: number; image: string; time: string } }) => (
    <TouchableOpacity style={styles.encounterItem}>
      <Image source={{ uri: item.image }} style={styles.encounterImage} />
      <View style={styles.encounterInfo}>
        <Text style={styles.encounterName}>{item.name}, {item.age}</Text>
        <Text style={styles.encounterTime}>{item.time}</Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Encounters</Text>
        <View style={styles.headerButton} />
      </View>

      <FlatList
        data={sampleEncounters}
        renderItem={renderEncounterItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Recent Encounters</Text>
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
          onPress={() => router.push('/(app)/encounters')}
        >
          <Ionicons name="albums" size={24} color="#6C5CE7" />
          <Text style={[styles.tabText, styles.activeTabText]}>Encounters</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/swipe')}
        >
          <Ionicons name="heart-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Likes</Text>
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
  encounterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  encounterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  encounterInfo: {
    flex: 1,
  },
  encounterName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  encounterTime: {
    fontSize: 14,
    color: '#8E8E93',
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
