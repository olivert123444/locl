import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TestOffersEntryScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offers Testing Hub</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Screens</Text>
        <Text style={styles.sectionDescription}>
          Access various test screens to verify offers functionality
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(app)/test-offer-creation')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Test Offer Creation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(app)/chats')}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Chats Screen (View Offers)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/(app)/test-utils')}
        >
          <Ionicons name="construct-outline" size={24} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Test Utilities</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing Instructions</Text>
        <Text style={styles.instructionText}>
          1. Use the "Test Offer Creation" screen to create test offers
        </Text>
        <Text style={styles.instructionText}>
          2. Navigate to the "Chats Screen" to view and interact with offers
        </Text>
        <Text style={styles.instructionText}>
          3. On the Chats Screen, switch to the "New Offers" tab
        </Text>
        <Text style={styles.instructionText}>
          4. Swipe right on an offer to accept it, or left to decline it
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Troubleshooting</Text>
        <Text style={styles.instructionText}>
          • If offers don't appear, check console logs for errors
        </Text>
        <Text style={styles.instructionText}>
          • Verify that the listing ID and buyer ID are valid
        </Text>
        <Text style={styles.instructionText}>
          • Make sure the offer price is a valid number
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
});
