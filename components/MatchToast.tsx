import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MatchToast = () => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const translateY = new Animated.Value(-100);
  const { width } = Dimensions.get('window');

  // Function to show a toast notification
  const showToast = (data: { message: string; type?: 'success' | 'error' | 'info' }) => {
    console.log('MatchToast - showToast called with:', data);
    
    // Set toast content
    setMessage(data.message);
    setToastType(data.type || 'success');
    setVisible(true);
    
    // Animate in
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
    
    // Hide after 5 seconds
    setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 5000);
  };

  // Subscribe to showToast events
  useEffect(() => {
    console.log('MatchToast - Component mounted, subscribing to showToast events');
    
    // Handler for showToast events
    const handleShowToast = (event: any) => {
      if (event.detail && event.detail.message) {
        console.log('MatchToast - Received showToast event:', event.detail);
        showToast({
          message: event.detail.message,
          type: event.detail.type || 'success'
        });
      }
    };
    
    // Add the event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('showMatchToast', handleShowToast as EventListener);
    }
    
    // Clean up
    return () => {
      console.log('MatchToast - Component unmounting, unsubscribing from showToast events');
      if (typeof window !== 'undefined') {
        window.removeEventListener('showMatchToast', handleShowToast as EventListener);
      }
    };
  }, []);

  // Hide toast when clicked
  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          width: width,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.text}>{message}</Text>
        <Ionicons name="close" size={20} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 10,
  },
});

export default MatchToast;
