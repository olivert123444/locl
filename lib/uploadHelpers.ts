import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Maximum dimensions for uploaded images
const MAX_IMAGE_DIMENSION = 1200; // pixels

/**
 * Optimizes an image before upload
 * @param imageUri URI of the image to optimize
 * @returns Promise resolving to the optimized image URI
 */
async function optimizeImage(imageUri: string): Promise<string> {
  console.log('Optimizing image:', imageUri.substring(0, 50) + '...');
  
  // If it's already a data URL, we need to check if we can optimize it further
  if (imageUri.startsWith('data:image/')) {
    // We'll implement a basic quality reduction for data URLs
    try {
      // For data URLs, we can create a canvas and reduce quality
      if (Platform.OS === 'web') {
        return await optimizeDataUrlOnWeb(imageUri);
      } else {
        // On native platforms, we'll just return the original for now
        // since we can't use expo-image-manipulator
        console.log('Native platform optimization not implemented, returning original');
        return imageUri;
      }
    } catch (error) {
      console.error('Error optimizing data URL:', error);
      return imageUri; // Return original on error
    }
  }
  
  // For file URIs, we would normally use expo-image-manipulator
  // Since we can't install it due to dependency conflicts, we'll
  // just return the original URI for now
  console.log('File URI optimization not implemented, returning original');
  return imageUri;
}

/**
 * Optimizes a data URL image on web platform using canvas
 * @param dataUrl The data URL to optimize
 * @returns Promise resolving to an optimized data URL
 */
async function optimizeDataUrlOnWeb(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }
      
      // Create canvas and draw image with new dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Could not get canvas context');
        resolve(dataUrl); // Return original on error
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // Get the image type from the data URL
      const imageType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';
      
      // Convert to new data URL with reduced quality
      const quality = 0.8; // 80% quality
      let optimizedDataUrl = canvas.toDataURL(imageType, quality);
      
      // Check if the optimization actually reduced the size
      if (optimizedDataUrl.length > dataUrl.length) {
        console.log('Optimized image is larger than original, using original');
        resolve(dataUrl);
      } else {
        console.log(`Optimized image: ${Math.round(optimizedDataUrl.length / 1024)}KB (was ${Math.round(dataUrl.length / 1024)}KB)`);
        resolve(optimizedDataUrl);
      }
    };
    
    img.onerror = () => {
      console.error('Error loading image for optimization');
      reject(new Error('Failed to load image for optimization'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Uploads an image to Supabase storage
 * @param imageUri - The local URI of the image to upload
 * @param bucketName - The name of the storage bucket (e.g., 'listings', 'avatars')
 * @param prefix - Optional prefix for the file name (e.g., 'user-123')
 * @returns Promise resolving to the public URL of the uploaded image
 */
export const uploadImageToStorage = async (
  imageUri: string,
  bucketName: string = 'listings',
  prefix: string = ''
): Promise<string> => {
  if (!imageUri) {
    throw new Error('No image URI provided');
  }

  try {
    // First optimize the image (resize/compress)
    const optimizedImageUri = await optimizeImage(imageUri);
    imageUri = optimizedImageUri; // Use the optimized version
    console.log(`Uploading image to ${bucketName} bucket...`);
    
    // Check if the image is a data URL
    const isDataUrl = imageUri.startsWith('data:image/');
    console.log(`Image URI type: ${isDataUrl ? 'Data URL' : 'File URI'}`);
    
    let fileExt: string;
    if (isDataUrl) {
      // Extract mime type from data URL (data:image/jpeg;base64,...)
      const mimeMatch = imageUri.match(/data:image\/(\w+);/);
      fileExt = mimeMatch ? mimeMatch[1].toLowerCase() : 'jpg';
      // Handle special case for jpg
      if (fileExt === 'jpeg') fileExt = 'jpg';
    } else {
      fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    }
    
    const isValidExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
    
    if (!isValidExt) {
      throw new Error(`Unsupported file extension: ${fileExt}`);
    }
    
    // Generate a unique filename
    const fileName = `${prefix ? prefix + '-' : ''}${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Determine content type based on extension
    const contentType = fileExt === 'png' 
      ? 'image/png' 
      : fileExt === 'gif'
        ? 'image/gif'
        : fileExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    
    console.log(`Processing image: ${fileName} (${contentType})`);
    
    // Get the image data based on platform and image type
    let fileData: Blob | ArrayBuffer;
    
    if (isDataUrl) {
      console.log('Data URL detected, extracting data...');
      // Extract the base64 data from the data URL
      const base64Data = imageUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URL format');
      }
      
      if (Platform.OS === 'web') {
        // For web, convert base64 to Blob
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const contentType = `image/${fileExt}`;
        fileData = new Blob(byteArrays, { type: contentType });
      } else {
        // For native, convert base64 to ArrayBuffer
        const buffer = Buffer.from(base64Data, 'base64');
        fileData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
    } else {
      // Regular file URI
      if (Platform.OS === 'web') {
        console.log('Web platform detected, fetching blob...');
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image blob on web: ${response.status} ${response.statusText}`);
        }
        fileData = await response.blob();
      } else {
        console.log('Native platform detected, reading file as base64...');
        const base64 = await FileSystem.readAsStringAsync(imageUri, { 
          encoding: FileSystem.EncodingType.Base64 
        });
        
        // Convert base64 to ArrayBuffer for Supabase
        const buffer = Buffer.from(base64, 'base64');
        fileData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      }
    }
    
    // Upload the file using Supabase Storage API
    console.log(`Uploading to ${bucketName}/${filePath}...`);
    
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, fileData, {
        contentType,
        upsert: true,
      });
    
    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
    
    if (!data || !data.path) {
      throw new Error('Upload successful but no path returned');
    }
    
    // Get the public URL
    const { data: urlData } = supabase
      .storage
      .from(bucketName)
      .getPublicUrl(data.path);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }
    
    console.log(`Upload successful! Public URL: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Error in uploadImageToStorage:', error);
    throw error;
  }
};

/**
 * Uploads multiple images to Supabase storage
 * @param imageUris - Array of local URIs of images to upload
 * @param bucketName - The name of the storage bucket
 * @param prefix - Optional prefix for the file names
 * @param onProgress - Optional callback function to track upload progress
 * @returns Promise resolving to an array of public URLs of the uploaded images
 */
export const uploadMultipleImages = async (
  imageUris: string[],
  bucketName: string = 'listings',
  prefix: string = '',
  onProgress?: (progress: number, currentIndex: number, totalImages: number) => void
): Promise<string[]> => {
  if (!imageUris || imageUris.length === 0) {
    return [];
  }
  
  console.log(`Starting batch upload of ${imageUris.length} images...`);
  
  const uploadedUrls: string[] = [];
  const errors: Error[] = [];
  
  // Process images sequentially to avoid overwhelming the network
  for (const [index, uri] of imageUris.entries()) {
    try {
      console.log(`Processing image ${index + 1}/${imageUris.length}...`);
      
      // Call progress callback with 0% for this image
      if (onProgress) {
        onProgress(0, index, imageUris.length);
      }
      
      const imagePrefix = prefix ? `${prefix}-${index}` : `img-${index}`;
      const url = await uploadImageToStorage(uri, bucketName, imagePrefix);
      uploadedUrls.push(url);
      
      // Call progress callback with 100% for this image
      if (onProgress) {
        onProgress(100, index, imageUris.length);
      }
    } catch (error) {
      console.error(`Error uploading image ${index + 1}:`, error);
      errors.push(error instanceof Error ? error : new Error(String(error)));
      
      // Call progress callback with error state
      if (onProgress) {
        onProgress(-1, index, imageUris.length);
      }
    }
  }
  
  console.log(`Batch upload complete. Successful: ${uploadedUrls.length}, Failed: ${errors.length}`);
  
  if (uploadedUrls.length === 0 && errors.length > 0) {
    // If all uploads failed, throw the first error
    throw errors[0];
  }
  
  return uploadedUrls;
};
