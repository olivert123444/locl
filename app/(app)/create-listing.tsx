import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, createListing } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';


const categories = [
  'Furniture', 
  'Electronics', 
  'Clothing', 
  'Books', 
  'Sports', 
  'Home Goods',
  'Toys & Games',
  'Vehicles',
  'Other'
];

export default function CreateListingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    if (images.length >= 5) {
      setError('You can only upload up to 5 images');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        setError('We need camera roll permissions to upload images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setError('Failed to select image. Please try again.');
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];
    const uploadedUrls: string[] = [];
    
    console.log('Starting image upload process...');

    for (const imageUri of images) {
      try {
        const fileExt = imageUri.split('.').pop();
        const fileName = `${user?.id}-${Date.now()}-${uploadedUrls.length}.${fileExt}`;
        const filePath = `listings/${fileName}`;
        const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
        
        console.log(`Processing image: ${fileName}`);

        // Get the image as a Blob or Buffer
        let fileData: Blob | Buffer;
        if (Platform.OS === 'web') {
          console.log('Web platform detected, fetching blob...');
          const response = await fetch(imageUri);
          if (!response.ok) throw new Error('Failed to fetch image blob on web');
          fileData = await response.blob();
        } else {
          console.log('Native platform detected, reading file as base64...');
          const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
          fileData = Buffer.from(base64, 'base64');
        }

        console.log('Preparing to upload using fetch API...');
        
        // Get the current session for the auth token
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          throw new Error('No authentication token available. Please log in again.');
        }
        
        const accessToken = sessionData.session.access_token;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzkixvdhdvhhwamglszu.supabase.co';
        const apiUrl = `${supabaseUrl}/storage/v1/object/listings/${fileName}`;
        
        console.log('Upload URL:', apiUrl);
        
        // Create FormData for the upload
        const formData = new FormData();
        
        // For web, we can use the Blob directly
        if (Platform.OS === 'web') {
          // Create a File object from the Blob
          const file = new File([fileData as Blob], fileName, { type: contentType });
          formData.append('file', file);
        } else {
          // For native, we need to create a Blob from the Buffer
          const blob = new Blob([fileData as Buffer], { type: contentType });
          formData.append('file', blob, fileName);
        }
        
        // Add retry logic for upload
        let retries = 3;
        let uploadSuccess = false;
        let uploadError = null;
        
        while (retries > 0 && !uploadSuccess) {
          try {
            console.log(`Upload attempt ${4-retries}/3...`);
            
            // Use fetch to upload the file
            const uploadResponse = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                // Don't set Content-Type header when using FormData
                // as the browser will set it with the correct boundary
              },
              body: formData
            });
            
            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({}));
              console.error('Upload response error:', uploadResponse.status, errorData);
              uploadError = new Error(`Upload failed with status ${uploadResponse.status}: ${JSON.stringify(errorData)}`);
            } else {
              console.log('Upload successful!');
              uploadSuccess = true;
              break;
            }
          } catch (e) {
            console.error('Exception during upload:', e);
            uploadError = e;
          }
          
          if (!uploadSuccess && retries > 1) {
            console.log(`Upload attempt failed, retries left: ${retries-1}`);
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          retries--;
        }
        
        if (!uploadSuccess) {
          const errorMessage = uploadError instanceof Error 
            ? uploadError.message 
            : 'Supabase upload failed after multiple attempts';
          throw new Error(errorMessage);
        }

        // Get public URL using the Supabase client
        console.log('Getting public URL...');
        const { data } = supabase.storage.from('listings').getPublicUrl(filePath);
        if (!data || !data.publicUrl) throw new Error('Failed to get public URL for uploaded image.');
        
        console.log(`Public URL obtained: ${data.publicUrl}`);
        uploadedUrls.push(data.publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    }
    
    console.log(`Upload complete. Total images uploaded: ${uploadedUrls.length}`);
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!title) {
      setError('Please enter a title');
      return;
    }
    
    if (!price) {
      setError('Please enter a price');
      return;
    }
    
    if (isNaN(parseFloat(price))) {
      setError('Price must be a number');
      return;
    }
    
    if (!category) {
      setError('Please select a category');
      return;
    }
    
    // Temporarily bypassing the image requirement
    // if (images.length === 0) {
    //   setError('Please add at least one image');
    //   return;
    // }
    console.log('Image requirement bypassed temporarily');

    // Verify user is authenticated
    if (!user?.id) {
      setError('You must be logged in to create a listing');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting listing creation process...');
      
      // Bypass image upload process for now
      console.log('Bypassing image upload process...');
      // Use an empty array for images
      const imageUrls: string[] = [];
      
      // If you want to use a default placeholder image instead, uncomment this:
      // const imageUrls = ['https://via.placeholder.com/300x300?text=No+Image'];
      
      console.log('Using default image configuration:', imageUrls);
      
      // Create listing data object
      const listingData = {
        title,
        description,
        price: parseFloat(price),
        category,
        condition: 'good', // Default condition
        seller_id: user.id,
        images: imageUrls, // Store as array (jsonb)
        status: 'active',
        // Add location data for distance-based search
        location: {
          latitude: 48.8566, // Default to Paris coordinates for demo
          longitude: 2.3522,
          address: 'Paris, France'
        }
      };
      
      console.log('Prepared listing data:', JSON.stringify(listingData));
      
      // Insert directly into Supabase instead of using the helper function
      console.log('Inserting listing into Supabase...');
      const { data, error } = await supabase
        .from('listings')
        .insert(listingData)
        .select();
      
      if (error) {
        console.error('Supabase insert error:', error);
        throw new Error(error.message || 'Failed to insert listing into database');
      }
      
      console.log('Listing created successfully:', data);
      
      // Navigate back to home screen
      router.replace('/');
    } catch (error) {
      console.error('Error creating listing:', error);
      if (error instanceof Error) {
        setError(`Failed to create listing: ${error.message}`);
      } else {
        setError('Failed to create listing. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Listing</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="What are you selling?"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Text style={styles.label}>Price ($)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  category === cat && styles.categoryButtonActive
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text 
                  style={[
                    styles.categoryButtonText,
                    category === cat && styles.categoryButtonTextActive
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your item (condition, features, etc.)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Photos</Text>
          <View style={styles.imagesContainer}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Ionicons name="camera-outline" size={30} color="#777" />
                <Text style={styles.addImageText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Create Listing</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryButtonText: {
    color: '#333',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    marginBottom: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  addImageText: {
    color: '#777',
    marginTop: 4,
    fontSize: 12,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
