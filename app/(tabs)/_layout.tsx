import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MatchNotification from '@/components/MatchNotification';
import { useNotification } from '@/context/NotificationContext';
import ProtectedRoute from '@/app/(auth)/protected';



export default function TabsLayout() {
  const { resetMatchCount } = useNotification();

  return (
    <ProtectedRoute>
      <MatchNotification />
      <Tabs
        screenOptions={{
          headerShown: false,
          // Hide the tab bar since we're using the custom one from app layout
          tabBarStyle: { display: 'none' }
        }}>
        <Tabs.Screen name="nearby" />
        <Tabs.Screen name="swipe" />
        <Tabs.Screen 
          name="chat"
          listeners={{
            tabPress: () => {
              // Reset the match count when the Chats tab is pressed
              resetMatchCount();
            },
          }}
        />
        <Tabs.Screen name="profile" />
      </Tabs>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({});
