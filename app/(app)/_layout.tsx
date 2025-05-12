import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { useNotification } from '@/context/NotificationContext';
import ProtectedRoute from '@/app/(auth)/protected';
import BottomTabBar from '@/components/BottomTabBar';



export default function AppLayout() {
  return (
    <ProtectedRoute>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Chat' }} />
          <Stack.Screen name="nearby" options={{ headerShown: false }} />
          {/* Add other non-tab screens here if needed */}
        </Stack>
        <BottomTabBar />
      </View>
    </ProtectedRoute>
  );
}



const styles = StyleSheet.create({});
