import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadUserAvatar } from '@/lib/supabase';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  size?: number;
  onAvatarUpdated?: (newUrl: string) => void;
}

export default function AvatarUpload({ 
  userId, 
  currentAvatarUrl, 
  size = 80,
  onAvatarUpdated 
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  // Update avatarUrl state when currentAvatarUrl prop changes
  useEffect(() => {
    if (currentAvatarUrl) {
      console.log('AvatarUpload: Updating avatar URL from props:', currentAvatarUrl);
      setAvatarUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl]);

  const handleAvatarUpload = async () => {
    try {
      // Request permissions
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload an avatar!');
          return;
        }
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        console.log('Selected image:', result.assets[0].uri);
        
        try {
          // Upload avatar using our reusable function
          const publicUrl = await uploadUserAvatar(userId, result.assets[0].uri);
          console.log('Avatar uploaded successfully, public URL:', publicUrl);
          
          // Update local state
          setAvatarUrl(publicUrl);
          
          // Notify parent component
          if (onAvatarUpdated) {
            onAvatarUpdated(publicUrl);
          }
          
          Alert.alert('Success', 'Profile picture updated successfully!');
        } catch (error) {
          console.error('Error uploading avatar:', error);
          Alert.alert('Upload Failed', 'Failed to upload profile picture. Please try again.');
        } finally {
          setIsUploading(false);
        }
      }
    } catch (error) {
      console.error('Error in image picker:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image 
        source={
          avatarUrl && avatarUrl.trim() 
            ? { uri: avatarUrl } 
            : require('@/assets/images/adaptive-icon.png')
        } 
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} 
      />
      
      {/* Upload Button - Always visible */}
      <TouchableOpacity 
        style={[styles.uploadButton, { 
          width: size * 0.4, 
          height: size * 0.4, 
          borderRadius: size * 0.2,
          bottom: 0,
          right: 0
        }]} 
        onPress={handleAvatarUpload}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="add" size={size * 0.25} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  uploadButton: {
    position: 'absolute',
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 8,
    zIndex: 100,
  },
});
