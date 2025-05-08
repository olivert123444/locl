import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileSetup() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSeller, setIsSeller] = useState(true);
  const [isBuyer, setIsBuyer] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('We need camera roll permissions to set your profile picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setErrorMsg('Failed to select image. Please try again.');
    }
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImage) return null;
    
    try {
      const fileExt = profileImage.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;
      
      // Convert image to blob
      const response = await fetch(profileImage);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMsg('Failed to upload profile image. Your profile will be saved without an image.');
      return null;
    }
  };

  const handleContinue = async () => {
    if (!name) {
      setErrorMsg('Please enter your name');
      return;
    }

    setIsLoading(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Upload profile image if selected
      const avatarUrl = profileImage ? await uploadProfileImage() : null;
      
      // First get the existing user to preserve other fields
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError);
        throw fetchError;
      }

      // Define interface for user data
      interface UserUpdateData {
        id: string;
        full_name: string;
        bio: string;
        is_seller: boolean;
        is_buyer: boolean;
        updated_at: string;
        avatar_url?: string | null;
        email?: string;
        created_at?: string;
        location?: any; // Using any for the JSONB field
      }
      
      // Prepare update data
      const updateData: UserUpdateData = {
        id: user.id,
        full_name: name,
        bio: bio,
        is_seller: isSeller,
        is_buyer: isBuyer,
        updated_at: new Date().toISOString(),
      };

      // Only update avatar if a new one was uploaded
      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      // If user doesn't exist (which shouldn't happen at this point), add required fields
      if (!existingUser) {
        updateData.email = user.email || '';
        updateData.created_at = new Date().toISOString();
        // Create an empty location object if it doesn't exist
        updateData.location = {
          city: '',
          zip_code: '',
          country: 'US'
        };
      }
      
      console.log('Updating user profile with data:', updateData);
      
      console.log('Attempting to save profile with data:', updateData);
      
      // Try to update first (most likely scenario)
      let result;
      if (existingUser) {
        console.log('Updating existing user record');
        result = await supabase
          .from('users')
          .update({
            full_name: name,
            bio: bio,
            is_seller: isSeller,
            is_buyer: isBuyer,
            updated_at: new Date().toISOString(),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {})
          })
          .eq('id', user.id);
      } else {
        // Insert if user doesn't exist yet
        console.log('Creating new user record');
        result = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: name,
            bio: bio,
            is_seller: isSeller,
            is_buyer: isBuyer,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
            location: {
              city: '',
              zip_code: '',
              country: 'US'
            }
          });
      }
      
      console.log('Profile save result:', result);
      
      if (result.error) {
        console.error('Profile update error:', result.error);
        throw result.error;
      }
      
      console.log('Profile updated successfully with name:', name);
      
      // Navigate to the next onboarding step
      router.push('/(onboarding)/permissions');
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrorMsg('Failed to save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about yourself to help others connect with you.
        </Text>

        <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
          {profileImage ? (
            <View style={styles.profileImageContainer}>
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>Add Profile Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bio (Optional)</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell others a bit about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>I want to sell items</Text>
          <Switch
            value={isSeller}
            onValueChange={setIsSeller}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>I want to buy items</Text>
          <Switch
            value={isBuyer}
            onValueChange={setIsBuyer}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
          />
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <TouchableOpacity 
          style={[styles.button, !name && styles.buttonDisabled]} 
          onPress={handleContinue}
          disabled={!name}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#555',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#777',
    textAlign: 'center',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
