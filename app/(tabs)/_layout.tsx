import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import MatchNotification from '@/components/MatchNotification';
import { useNotification } from '@/context/NotificationContext';
import ProtectedRoute from '@/app/(auth)/protected';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

// Badge component for notification count
const NotificationBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count}</Text>
    </View>
  );
};

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { newMatchCount, resetMatchCount } = useNotification();

  return (
    <ProtectedRoute>
      <MatchNotification />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#6C5CE7',
          tabBarInactiveTintColor: '#8E8E93',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
              borderTopWidth: 1,
              borderTopColor: '#eee',
              paddingTop: 5,
            },
            default: {
              borderTopWidth: 1,
              borderTopColor: '#eee',
              paddingTop: 5,
            },
          }),
        }}>
        <Tabs.Screen
          name="nearby"
          options={{
            title: 'Nearby',
            tabBarIcon: ({ color, focused }) => 
              <Ionicons name={focused ? "location" : "location-outline"} size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="swipe"
          options={{
            title: 'Likes',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "heart" : "heart-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color, focused }) => (
              <View>
                <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />
                <NotificationBadge count={newMatchCount} />
              </View>
            ),
          }}
          listeners={{
            tabPress: () => {
              // Reset the match count when the Chats tab is pressed
              resetMatchCount();
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => 
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />,
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
