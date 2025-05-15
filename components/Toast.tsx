import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onHide,
  duration = 5000,
  type = 'success'
}) => {
  const [visible, setVisible] = useState(false);
  const translateY = new Animated.Value(-100);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    if (isVisible) {
      setVisible(true);
      // Animate in
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();

      // Hide after duration
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!visible) return null;

  // Define icon based on type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Ionicons name="checkmark-circle" size={24} color="white" />;
      case 'error':
        return <Ionicons name="alert-circle" size={24} color="white" />;
      case 'info':
        return <Ionicons name="information-circle" size={24} color="white" />;
      default:
        return <Ionicons name="checkmark-circle" size={24} color="white" />;
    }
  };

  // Define background color based on type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#6C5CE7'; // Purple
      case 'error':
        return '#FF6B6B'; // Red
      case 'info':
        return '#48DBFB'; // Blue
      default:
        return '#6C5CE7';
    }
  };

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
      <View style={[styles.content, { backgroundColor: getBackgroundColor() }]}>
        {getIcon()}
        <Text style={styles.text}>{message}</Text>
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
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 10,
    flex: 1,
  }
});

export default Toast;
