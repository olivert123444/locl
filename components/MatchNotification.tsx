import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { useNotification } from '@/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';

const MatchNotification = () => {
  const { showMatchPopup, latestMatchImage } = useNotification();
  const [visible, setVisible] = useState(true); // Always show for testing
  const translateY = new Animated.Value(-100);
  const { width } = Dimensions.get('window');

  // Force a test notification to appear
  useEffect(() => {
    // Show test notification
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();

    // Hide after 5 seconds
    const timer = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Regular notification logic
  useEffect(() => {
    if (showMatchPopup) {
      setVisible(true);
      // Animate in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else if (visible) {
      // Animate out
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [showMatchPopup]);

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
      <View style={styles.content}>
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.text}>You have a new match!</Text>
        <View style={styles.imageContainer}>
          <Image 
            source={{ 
              uri: latestMatchImage || 'https://images.unsplash.com/photo-1545454675-3531b543be5d'
            }} 
            style={styles.image} 
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40, // Adjust for status bar
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginHorizontal: 10,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  imageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default MatchNotification;
