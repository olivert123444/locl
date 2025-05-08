import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function ChatTab() {
  const router = useRouter();
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>Chat functionality temporarily disabled</Text>
        <Text style={styles.emptySubtext}>We're working on improving the chat experience</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => router.push('/(app)/nearby')}
        >
          <Text style={styles.browseButtonText}>Browse Items</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
    fontWeight: 'bold',
    fontSize: 16,
  },
});
