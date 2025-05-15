import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Stack, Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DevToolsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Dev Tools',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#fff',
        }}
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>Development Tools</Text>
        <Text style={styles.description}>
          These tools are for internal testing only and do not affect the main app.
        </Text>
        
        <ScrollView style={styles.toolsContainer}>
          <Link href="/dev-tools-offers-test" asChild>
            <Pressable style={styles.toolButton}>
              <Text style={styles.toolButtonTitle}>Offers Test</Text>
              <Text style={styles.toolButtonDescription}>
                Test offers and chats flow with mock users
              </Text>
            </Pressable>
          </Link>
          
          <Link href="/(tabs)/swipe" asChild>
            <Pressable style={styles.backButton}>
              <Text style={styles.backButtonText}>Back to App</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#121212',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  toolsContainer: {
    flex: 1,
  },
  toolButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  toolButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  toolButtonDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  backButton: {
    backgroundColor: '#666',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
