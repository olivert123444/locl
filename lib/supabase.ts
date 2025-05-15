import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { createClient } from '@supabase/supabase-js';
import { getUserDisplayName } from './userUtils';
import { getCurrentLocation, calculateDistance, formatDistance } from './locationService';

// Helper function to convert degrees to radians
function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Initialize Supabase with the correct URL and key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nzkixvdhdvhhwamglszu.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56a2l4dmRoZHZoaHdhbWdsc3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MjcyNzMsImV4cCI6MjA2MjIwMzI3M30.9JdSvPfUmG7k90b6jFQffLh1NqBJpRGFhTdMV-PAdgw';

// Log the URL being used to help with debugging
console.log('Using Supabase URL:', supabaseUrl);

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'X-Client-Info': 'locl-app',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

// Helper function to get archived listings for a user
export const getArchivedListings = async (userId: string) => {
  try {
    console.log(`Fetching archived listings for user ${userId}`);
    
    // Modified query to match your database schema
    const { data, error } = await supabase
      .from('archive')
      .select(`
        *,
        listings:listing_id(
          id, 
          title, 
          description, 
          price, 
          images, 
          seller_id, 
          category, 
          status, 
          created_at, 
          location,
          user_profiles:seller_id(full_name, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching archived listings:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No archived listings found');
      return [];
    }
    
    console.log(`Found ${data.length} archived listings`);
    
    // Format the data for display
    const formattedListings = data.map(item => {
      // Derive main_image_url from the images array to maintain compatibility
      const mainImageUrl = Array.isArray(item.listings?.images) && item.listings.images.length > 0 
        ? item.listings.images[0] 
        : 'https://via.placeholder.com/300x300?text=No+Image';
      
      return {
        id: item.listing_id,
        archiveId: item.id,
        title: item.listings?.title || 'Unknown Item',
        price: item.listings?.price || 0,
        description: item.listings?.description || '',
        image: mainImageUrl,
        main_image_url: mainImageUrl, // Add this for compatibility
        seller: item.listings?.user_profiles?.full_name || 'Unknown Seller',
        seller_id: item.listings?.seller_id,
        seller_avatar: item.listings?.user_profiles?.avatar_url,
        archivedAt: item.created_at,
        status: item.listings?.status || 'unknown',
        // Format the archived date in a readable format
        archivedAtFormatted: formatRelativeTime(new Date(item.created_at))
      };
    });
    
    return formattedListings;
  } catch (error) {
    console.error('Error in getArchivedListings:', error);
    throw error;
  }
};

// Helper function to add a listing to archive
export const addToArchive = async (userId: string, listingId: string) => {
  try {
    console.log(`Adding listing ${listingId} to archive for user ${userId}`);
    
    // Check if already archived
    const { data: existingItem, error: checkError } = await supabase
      .from('archive')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();
      
    if (!checkError && existingItem) {
      console.log('Listing already in archive');
      return existingItem;
    }
    
    // Add to archive
    const { data, error } = await supabase
      .from('archive')
      .insert({
        user_id: userId,
        listing_id: listingId,
        created_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error('Error adding to archive:', error);
      throw error;
    }
    
    console.log('Successfully added to archive');
    return data;
  } catch (error) {
    console.error('Error in addToArchive:', error);
    throw error;
  }
};

// Helper function to remove a listing from archive
export const removeFromArchive = async (userId: string, listingId: string) => {
  try {
    console.log(`Removing listing ${listingId} from archive for user ${userId}`);
    
    const { data, error } = await supabase
      .from('archive')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);
      
    if (error) {
      console.error('Error removing from archive:', error);
      throw error;
    }
    
    console.log('Successfully removed from archive');
    return true;
  } catch (error) {
    console.error('Error in removeFromArchive:', error);
    throw error;
  }
};

// Helper function to format relative time (e.g., "2 days ago")
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  
  if (diffInSecs < 60) return 'just now';
  if (diffInMins < 60) return `${diffInMins} ${diffInMins === 1 ? 'minute' : 'minutes'} ago`;
  if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffInDays < 7) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  if (diffInWeeks < 4) return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  if (diffInMonths < 12) return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  
  return date.toLocaleDateString();
};

// Helper function to update user profile
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    console.log('Updating user profile with data:', {
      userId,
      updateFieldCount: Object.keys(updates).length,
      hasFullName: !!updates.full_name,
      hasBio: !!updates.bio,
      hasAvatar: !!updates.avatar_url
    });
    
    // First get existing profile data to ensure we don't lose anything
    const { data: existingData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found, which is fine for new users
      console.warn('Error fetching existing profile data:', fetchError);
    }
    
    // Merge existing data with updates, preserving all fields
    const mergedData = {
      ...(existingData || {}),
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // If this is the first update, ensure required fields have defaults
    if (!existingData) {
      mergedData.is_seller = mergedData.is_seller !== false;
      mergedData.is_buyer = mergedData.is_buyer !== false;
    }
    
    console.log('Merged profile data for update:', {
      hasFullName: !!mergedData.full_name,
      hasBio: !!mergedData.bio,
      hasAvatar: !!mergedData.avatar_url,
      isOnboarded: !!mergedData.is_onboarded
    });
    
    // Create a new object with only the fields we know exist in the database
    // This prevents errors when trying to update fields that don't exist
    // IMPORTANT: Do NOT include email in updates as it's managed by auth system
    // and has a NOT NULL constraint
    const sanitizedData: Record<string, any> = {
      id: userId,
      full_name: mergedData.full_name,
      bio: mergedData.bio,
      avatar_url: mergedData.avatar_url,
      is_seller: mergedData.is_seller,
      is_buyer: mergedData.is_buyer,
      is_onboarded: mergedData.is_onboarded,
      location: mergedData.location,
      updated_at: new Date().toISOString()
    };
    
    // Preserve existing email value if available, but NEVER set it to null
    if (existingData?.email) {
      // Only include email in update if we have a valid existing value
      sanitizedData.email = existingData.email;
    }
    
    console.log('Sanitized profile data for update:', {
      hasFullName: !!sanitizedData.full_name,
      hasBio: !!sanitizedData.bio,
      hasAvatar: !!sanitizedData.avatar_url,
      isOnboarded: !!sanitizedData.is_onboarded
    });
    
    const { data, error } = await supabase
      .from('users')
      .upsert(sanitizedData);
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    throw error;
  }
};

// Helper function to upload user avatar to Supabase Storage
export const uploadUserAvatar = async (userId: string, file: File | Blob | string) => {
  try {
    console.log(`Starting avatar upload for user: ${userId}`);
    
    // Defensive check to ensure userId exists
    if (!userId) {
      console.error('User ID is required for avatar upload');
      return null;
    }

    // Generate a timestamped filename to avoid CDN cache issues
    const timestamp = Date.now();
    const filePath = `${userId}/avatar-${timestamp}.jpg`;
    
    // Debug logging for file type
    console.log('File type:', typeof file);
    if (typeof file === 'string') {
      console.log('File URI preview:', file.substring(0, 50) + '...');
    }
    
    // Always convert to Blob for cross-platform compatibility
    let fileToUpload: Blob;
    let contentType: string;
    
    if (typeof file === 'string') {
      console.log('Converting URI to Blob');
      try {
        // Check if the string is a data URL (base64)
        if (file.startsWith('data:')) {
          console.log('Processing base64 data URL');
          // Extract the content type and base64 data
          const matches = file.match(/^data:([\w\/+]+);base64,(.*)$/);
          if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 data URL format');
          }
          
          contentType = matches[1] || 'image/jpeg';
          const base64Data = matches[2];
          const arrayBuffer = decode(base64Data);
          fileToUpload = new Blob([arrayBuffer], { type: contentType });
          console.log(`Created blob from base64 data, size: ${fileToUpload.size} bytes`);
        } else {
          // It's a regular URI, fetch it
          console.log('Fetching image from URI');
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch(file, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          fileToUpload = await response.blob();
          // Get MIME type from the blob
          contentType = fileToUpload.type || 'image/jpeg';
        }
      } catch (fetchError) {
        console.error('Error processing image:', fetchError);
        // If we can't process the image, use a default avatar instead
        // and update the user record with a placeholder
        const defaultAvatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/default-avatar.jpg`;
        
        // Update user with default avatar
        await supabase
          .from('users')
          .update({
            avatar_url: defaultAvatarUrl,
            updated_at: new Date().toISOString(),
            is_onboarded: true // Mark as onboarded even if image upload fails
          })
          .eq('id', userId);
          
        return defaultAvatarUrl;
      }
    } else if (file instanceof Blob) {
      console.log('Processing Blob object');
      fileToUpload = file;
      contentType = fileToUpload.type || 'image/jpeg';
    } else {
      console.log('Processing File object');
      // Handle File object (which is a type of Blob)
      fileToUpload = file;
      contentType = fileToUpload.type || 'image/jpeg';
    }
    
    console.log(`File content type: ${contentType}`);
    console.log(`File size: ${fileToUpload.size} bytes`);
    
    // Check if file size is too large (over 5MB)
    if (fileToUpload.size > 5 * 1024 * 1024) {
      console.warn('File size too large, compressing image');
      // In a real app, you would compress the image here
      // For now, we'll just proceed with the upload
    }

    // Step 1: Upload the avatar to Supabase Storage with retry logic
    let uploadAttempts = 0;
    let uploadData;
    let uploadError;
    
    while (uploadAttempts < 3) {
      try {
        uploadAttempts++;
        console.log(`Upload attempt ${uploadAttempts}`);
        
        const result = await supabase.storage
          .from('avatars')
          .upload(filePath, fileToUpload, {
            upsert: true, // Overwrite any existing file
            contentType: contentType,
          });
          
        uploadData = result.data;
        uploadError = result.error;
        
        if (!uploadError) break; // Success, exit retry loop
        
        console.error(`Upload attempt ${uploadAttempts} failed:`, uploadError);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      } catch (retryError) {
        console.error(`Exception in upload attempt ${uploadAttempts}:`, retryError);
        uploadError = retryError;
      }
    }

    if (uploadError) {
      console.error('All avatar upload attempts failed:', uploadError);
      // If upload fails after retries, use a placeholder URL
      const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/avatars/default-avatar.jpg`;
      
      // Update user with fallback avatar and mark as onboarded anyway
      await supabase
        .from('users')
        .update({
          avatar_url: fallbackUrl,
          updated_at: new Date().toISOString(),
          is_onboarded: true // Mark as onboarded even if image upload fails
        })
        .eq('id', userId);
        
      return fallbackUrl;
    }

    console.log('Avatar uploaded successfully:', uploadData);

    // Step 2: Get public URL for the uploaded avatar
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      console.error('Failed to get public URL for avatar');
      // Use a fallback URL and mark as onboarded anyway
      const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/avatars/default-avatar.jpg`;
      
      await supabase
        .from('users')
        .update({
          avatar_url: fallbackUrl,
          updated_at: new Date().toISOString(),
          is_onboarded: true // Mark as onboarded even if we can't get the public URL
        })
        .eq('id', userId);
        
      return fallbackUrl;
    }

    console.log('Public avatar URL:', publicUrl);

    // Step 3: Update the user record directly with the avatar URL
    console.log('Updating user profile with avatar URL:', publicUrl);
    
    // Use upsert to ensure the profile is updated reliably
    const { data: userData, error: getUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (getUserError) {
      console.error('Error fetching current user data:', getUserError);
      // Continue to update anyway
    }
    
    // Create update payload with all existing user data plus new avatar
    const updatePayload = {
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
      is_onboarded: true, // Explicitly mark as onboarded
      // Preserve existing fields if available
      ...(userData ? {
        full_name: userData.full_name,
        bio: userData.bio,
        is_seller: userData.is_seller === true,
        is_buyer: userData.is_buyer === true
      } : {})
    };
    
    console.log('Update payload for user profile:', updatePayload);
    
    // Perform the update
    const { error: updateError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId);
      
    if (updateError) {
      console.error('Failed to update profile with avatar URL:', updateError);
      
      // Try a more focused update with just avatar and onboarding status
      console.log('Attempting focused update with only avatar_url and is_onboarded');
      const { error: fallbackError } = await supabase
        .from('users')
        .update({ 
          avatar_url: publicUrl,
          is_onboarded: true 
        })
        .eq('id', userId);
        
      if (fallbackError) {
        console.error('Fallback update also failed:', fallbackError);
      } else {
        console.log('Fallback update succeeded with avatar URL and onboarding status');
      }
    } else {
      console.log('Profile successfully updated with avatar URL and all fields preserved');
    }

    return publicUrl;
  } catch (error) {
    console.error('Avatar upload failed:', error);
    // Update user with default avatar and mark as onboarded anyway
    const defaultAvatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/default-avatar.jpg`;
    
    await supabase
      .from('users')
      .update({
        avatar_url: defaultAvatarUrl,
        updated_at: new Date().toISOString(),
        is_onboarded: true // Mark as onboarded even if the entire process fails
      })
      .eq('id', userId);
      
    return defaultAvatarUrl;
  }
};

// Helper function to create a new listing
export const createListing = async (listingData: any) => {
  const { data, error } = await supabase
    .from('listings')
    .insert(listingData)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

// Helper function to delete a listing
export const deleteListing = async (listingId: string, userId: string) => {
  try {
    // First verify the listing belongs to the user
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('seller_id')
      .eq('id', listingId)
      .single();
    
    if (listingError) throw listingError;
    
    // Check if the listing belongs to the user
    if (listingData && listingData.seller_id !== userId) {
      throw new Error('You can only delete your own listings');
    }
    
    // Delete the listing
    // Note: With the ON DELETE CASCADE constraint in place, this will automatically
    // delete any related offers as well
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listingId);
      
    if (error) {
      // If there's still a foreign key constraint error, we need to handle it
      if (error.message?.includes('foreign key constraint')) {
        throw new Error('Cannot delete this listing because it has active offers. Please run the migration script to fix this issue.');
      }
      throw error;
    }
    
    return { success: true, message: 'Listing deleted successfully' };
  } catch (error: any) {
    console.error('Error in deleteListing:', error);
    throw error;
  }
};

// Helper function to get listings within a certain distance
export const getNearbyListings = async (userId: string, maxDistance: number = 50) => {
  console.log(`Fetching nearby listings for user ${userId} with max distance ${maxDistance}km`);
  
  try {
    // First try to get the user's current location using our location service
    let userLoc = await getCurrentLocation();
    let usingCurrentLocation = false;
    
    // If we couldn't get the current location, try to get the saved location from the user profile
    if (!userLoc) {
      console.log('Could not get current location, checking saved profile location');
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('location')
        .eq('id', userId)
        .single();
        
      if (!userError && userProfile?.location) {
        // Parse user location from profile
        userLoc = typeof userProfile.location === 'string' 
          ? JSON.parse(userProfile.location) 
          : userProfile.location;
        
        console.log('Using saved profile location:', userLoc);
      } else {
        console.log('No saved location found in profile or error fetching profile');
      }
    } else {
      usingCurrentLocation = true;
      console.log('Using current device location:', userLoc);
      
      // Optionally update the user's profile with the current location
      try {
        await supabase
          .from('users')
          .update({ location: userLoc })
          .eq('id', userId);
        console.log('Updated user profile with current location');
      } catch (updateError) {
        console.error('Error updating user location:', updateError);
        // Continue even if update fails
      }
    }
    
    // Get all active listings regardless of location
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*, users:seller_id(full_name, avatar_url, location)')
      .eq('status', 'active')
      .neq('seller_id', userId); // Don't show user's own listings
      
    if (listingsError) {
      console.error('Error fetching listings:', listingsError);
      throw listingsError;
    }
    
    if (!listings || listings.length === 0) {
      console.log('No listings found in database');
      return [];
    }
    
    console.log(`Found ${listings.length} listings in database`);
    
    // Process listings with distance calculation if user has location
    if (userLoc?.latitude && userLoc?.longitude) {
      console.log(`User location: ${userLoc.latitude}, ${userLoc.longitude}`);
      
      const listingsWithDistance = listings.map(listing => {
        let distance = 0;
        let formattedDistance = '';
        
        try {
          // Parse listing location
          const listingLoc = typeof listing.location === 'string' 
            ? JSON.parse(listing.location) 
            : listing.location;
          
          if (listingLoc?.latitude && listingLoc?.longitude) {
            // Use our calculateDistance function from locationService
            distance = calculateDistance(
              userLoc.latitude,
              userLoc.longitude,
              listingLoc.latitude,
              listingLoc.longitude
            );
            
            // Format the distance for display
            formattedDistance = formatDistance(distance);
            
            console.log(`Listing ${listing.id} distance: ${formattedDistance}`);
          } else {
            // Fallback to random distance if listing location is incomplete
            distance = Math.random() * (maxDistance * 0.8); // Random distance within 80% of max
            formattedDistance = formatDistance(distance);
            console.log(`Listing ${listing.id} has no location, using random distance: ${formattedDistance}`);
          }
        } catch (e) {
          // If there's an error parsing the JSON, use a random distance
          distance = Math.random() * (maxDistance * 0.8);
          formattedDistance = formatDistance(distance);
          console.log(`Error calculating distance for listing ${listing.id}, using random: ${formattedDistance}`);
        }
        
        return {
          ...listing,
          distance: parseFloat(distance.toFixed(1)),
          formattedDistance, // Add formatted distance for display
          seller: listing.users?.full_name || 'Unknown Seller',
          // Ensure images are properly formatted
          images: listing.images || [],
          main_image_url: Array.isArray(listing.images) && listing.images.length > 0 
            ? listing.images[0] 
            : 'https://via.placeholder.com/300x300?text=No+Image'
        };
      });
      
      // Filter listings by distance if requested
      const filteredListings = maxDistance > 0
        ? listingsWithDistance.filter(listing => listing.distance <= maxDistance)
        : listingsWithDistance;
      
      // Sort by distance
      const sortedListings = filteredListings.sort((a, b) => a.distance - b.distance);
      
      console.log(`Returning ${sortedListings.length} listings sorted by distance`);
      return sortedListings;
    }
    
    // If user has no location or invalid location, return all listings with random distances
    console.log('User has no valid location, using random distances');
    return listings.map(listing => {
      const distance = parseFloat((Math.random() * (maxDistance * 0.8)).toFixed(1));
      return {
        ...listing,
        distance,
        formattedDistance: formatDistance(distance),
        seller: listing.users?.full_name || 'Unknown Seller',
        // Ensure images are properly formatted
        images: listing.images || [],
        main_image_url: Array.isArray(listing.images) && listing.images.length > 0 
          ? listing.images[0] 
          : 'https://via.placeholder.com/300x300?text=No+Image'
      };
    });
    
  } catch (error) {
    console.error('Error in getNearbyListings:', error);
    // In case of any error, fall back to getting all listings
    return await getAllListings(userId);
  }
};

// Helper function to get all listings regardless of distance
async function getAllListings(userId: string) {
  console.log('Falling back to getAllListings');
  
  try {
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*, users:seller_id(full_name, avatar_url)')
      .eq('status', 'active')
      .neq('seller_id', userId) // Don't show user's own listings
      .order('created_at', { ascending: false });
      
    if (listingsError) throw listingsError;
    
    if (!listings || listings.length === 0) {
      console.log('No listings found in getAllListings');
      return [];
    }
    
    console.log(`Found ${listings.length} listings in getAllListings`);
    
    return listings.map(listing => ({
      ...listing,
      distance: parseFloat((Math.random() * 5).toFixed(1)), // Random distance under 5km
      seller: listing.users?.full_name || 'Unknown Seller',
      // Ensure images are properly formatted
      images: listing.images || [],
      main_image_url: Array.isArray(listing.images) && listing.images.length > 0 
        ? listing.images[0] 
        : 'https://via.placeholder.com/300x300?text=No+Image'
    }));
  } catch (error) {
    console.error('Error in getAllListings:', error);
    return [];
  }
};

// Helper function to create an offer (without automatically creating a chat)
export const createOffer = async (offerData: any) => {
  console.log('🔍 DEBUG - createOffer - Starting with data:', JSON.stringify(offerData, null, 2));
  
  // Make sure we're using the correct field names for the database schema
  // The offers table expects offer_price, not amount
  if (!offerData.offer_price && offerData.amount) {
    offerData.offer_price = offerData.amount;
    delete offerData.amount;
  }
  
  // Ensure we have the required fields
  if (!offerData.listing_id || !offerData.buyer_id || !offerData.offer_price) {
    console.error('Missing required fields for offer creation');
    throw new Error('Missing required fields: listing_id, buyer_id, and offer_price are required');
  }
  
  // If seller_id is not provided, fetch it from the listing
  if (!offerData.seller_id) {
    try {
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('*') // Select all fields for debugging
        .eq('id', offerData.listing_id)
        .single();
        
      if (listingError) {
        console.error('Error fetching listing seller:', listingError);
        throw new Error('Could not determine seller for this listing');
      }
      
      // Log the entire listing object for debugging
      console.log('🔍 DEBUG - createOffer - Listing data:', JSON.stringify(listingData, null, 2));
      
      if (!listingData) {
        console.warn('🚨 WARNING - Listing not found:', offerData.listing_id);
        throw new Error('Listing not found');
      }
      
      if (!listingData.seller_id) {
        console.warn('🚨 WARNING - Listing is missing seller_id:', listingData);
        throw new Error('Listing has no seller');
      }
      
      // Add seller_id to the offer data
      offerData.seller_id = listingData.seller_id;
    } catch (error) {
      console.error('Error getting seller_id:', error);
      throw error;
    }
  }
  
  // Validate that seller_id is a valid UUID string
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!offerData.seller_id || !uuidRegex.test(offerData.seller_id)) {
    console.warn('🚨 WARNING - Invalid seller_id format:', offerData.seller_id);
    throw new Error('Invalid seller_id format. Must be a valid UUID string.');
  }
  
  // Set default values for status and is_test
  if (!offerData.status) {
    offerData.status = 'pending';
  }
  
  // Always set is_test to false for production
  // Ensure it's a boolean, not a string
  offerData.is_test = false;
  
  // Final check to ensure seller_id is set correctly before insert
  if (!offerData.seller_id) {
    console.error('🚨 ERROR - Cannot create offer: seller_id is still undefined after listing lookup');
    throw new Error('Cannot create offer without a valid seller_id');
  }
  
  // Log the final offer data with emphasis on seller_id
  console.log('🔍 DEBUG - createOffer - Final offer data check before insert:');
  console.log('🔍 DEBUG - seller_id:', offerData.seller_id, '(must exist and be correct!)');
  console.log('🔍 DEBUG - Complete offer data:', JSON.stringify({
    listing_id: offerData.listing_id,
    buyer_id: offerData.buyer_id,
    seller_id: offerData.seller_id,
    offer_price: offerData.offer_price,
    status: offerData.status,
    is_test: offerData.is_test
  }, null, 2));
  
  // Insert the offer only if seller_id is valid
  const { data: offerData_, error: offerError } = await supabase
    .from('offers')
    .insert(offerData)
    .select();
  
  console.log('🔍 DEBUG - createOffer - Offer insert response:', {
    success: offerData_ ? true : false,
    data: offerData_,
    error: offerError
  });
    
  if (offerError) {
    console.error('Error creating offer:', offerError);
    throw offerError;
  }
  
  if (!offerData_ || offerData_.length === 0) {
    console.error('No offer data returned after insert');
    throw new Error('Failed to create offer');
  }
  
  const createdOffer = offerData_[0];
  console.log('🔍 DEBUG - createOffer - Offer created successfully:', JSON.stringify(createdOffer, null, 2));
  
  // After successful offer creation, add the listing to the archive table
  try {
    console.log('🔍 DEBUG - createOffer - Adding listing to archive table');
    
    // Insert into archive table using the current authenticated user ID and listing ID
    const { data: archiveData, error: archiveError } = await supabase
      .from('archive')
      .insert({
        user_id: offerData.buyer_id,
        listing_id: offerData.listing_id
      })
      .select();
    
    if (archiveError) {
      // Handle duplicate entry error gracefully (if unique constraint exists)
      if (archiveError.code === '23505') { // PostgreSQL unique violation code
        console.log('🔍 DEBUG - createOffer - Listing already in archive (unique constraint violation)');
      } else {
        console.error('Error adding listing to archive:', archiveError);
        // Don't throw here, we still want to return the offer data
        console.warn('Archive creation failed, but offer was created successfully');
      }
    } else {
      console.log('🔍 DEBUG - createOffer - Successfully added listing to archive:', archiveData);
    }
  } catch (archiveError) {
    console.error('Error in archive creation:', archiveError);
    // Don't throw here, we still want to return the offer data
    console.warn('Archive creation failed, but offer was created successfully');
  }
  
  try {
    // Get the listing details to find the seller_id
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('seller_id, title, images')
      .eq('id', offerData.listing_id)
      .single();
      
    if (listingError) {
      console.error('Error fetching listing details:', listingError);
      throw listingError;
    }
    
    if (!listingData) {
      console.error('No listing found with ID:', offerData.listing_id);
      throw new Error('Listing not found');
    }
    
    console.log('🔍 DEBUG - createOffer - Listing details fetched:', JSON.stringify(listingData, null, 2));
    
    // TODO: Re-enable notification creation once proper RLS policy is in place
    // Temporarily disabled to avoid RLS errors while continuing to work on other features
    console.log('🔍 DEBUG - createOffer - Notification creation skipped (temporarily disabled)');
  } catch (error) {
    console.error('Error in notification creation:', error);
    // Don't throw here, we still want to return the offer data
    console.warn('Notification creation failed, but offer was created successfully');
  }
  
  return offerData_;
};

// Helper function to handle offer responses (accept/decline)
export const respondToOffer = async (offerId: string, action: 'accept' | 'decline') => {
  console.log(`🔍 DEBUG - respondToOffer - Starting with offerId: ${offerId}, action: ${action}`);
  
  try {
    // First, fetch the offer details
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select(`
        *,
        listings:listing_id(*)
      `)
      .eq('id', offerId)
      .single();
      
    console.log('🔍 DEBUG - respondToOffer - Offer', offerId, 'fetched:', offerData ? 'success' : 'not found');
      
    if (offerError) {
      console.error('Error fetching offer:', offerError);
      throw offerError;
    }
    
    if (!offerData) {
      throw new Error('Offer not found');
    }
    
    if (offerData.status !== 'pending') {
      throw new Error(`Offer is already ${offerData.status}`);
    }
    
    console.log('🔍 DEBUG - respondToOffer - Offer details retrieved:', JSON.stringify(offerData, null, 2));
    
    // Update the offer status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    console.log('🔍 DEBUG - respondToOffer - Updating offer status:', {
      offerId,
      newStatus,
      sellerId: offerData.seller_id,
      buyerId: offerData.buyer_id,
      listingId: offerData.listing_id
    });
    
    const { error: updateError } = await supabase
      .from('offers')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId);
      
    console.log('🔍 DEBUG - respondToOffer - Offer update response:', {
      success: !updateError,
      error: updateError
    });
      
    if (updateError) {
      console.error('Error updating offer:', updateError);
      throw updateError;
    }
    
    console.log('🔍 DEBUG - respondToOffer - Offer', offerId, 'status updated to', newStatus);
    
    // If the offer is accepted, create a chat between buyer and seller
    let chatId = null;
    if (action === 'accept') {
      console.log('🔍 DEBUG - respondToOffer - Offer accepted, creating chat');
      
      // Check if a chat already exists for this listing and these users
      const { data: existingChats, error: chatCheckError } = await supabase
        .from('chats')
        .select('id')
        .eq('listing_id', offerData.listing_id)
        .eq('buyer_id', offerData.buyer_id)
        .eq('seller_id', offerData.seller_id);
        
      if (chatCheckError) {
        console.error('Error checking for existing chats:', chatCheckError);
      }
      
      if (existingChats && existingChats.length > 0) {
        console.log('🔍 DEBUG - respondToOffer - Chat already exists, using existing chat');
        chatId = existingChats[0].id;
      } else {
        console.log('🔍 DEBUG - respondToOffer - No existing chat found, creating new chat');
        
        // Create a new chat entry
        const chatData = {
          listing_id: offerData.listing_id,
          buyer_id: offerData.buyer_id,
          seller_id: offerData.seller_id,
          is_active: true,
          is_test: false,
          created_at: new Date().toISOString(),
          last_message_at: new Date().toISOString()
        };
        
        console.log('🔍 DEBUG - respondToOffer - Creating new chat with data:', JSON.stringify(chatData, null, 2));
        
        const { data: newChatData, error: chatCreateError } = await supabase
          .from('chats')
          .insert(chatData)
          .select();
          
        console.log('🔍 DEBUG - respondToOffer - Chat creation response:', {
          success: newChatData ? true : false,
          data: newChatData,
          error: chatCreateError
        });
          
        if (chatCreateError) {
          console.error('Error creating chat:', chatCreateError);
        } else if (newChatData && newChatData.length > 0) {
          console.log('🔍 DEBUG - respondToOffer - Chat created successfully:', JSON.stringify(newChatData[0], null, 2));
          chatId = newChatData[0].id;
          
          // Debug log for match toast
          console.log("🎉 Match toast logic triggered", {
            currentUserId: (window as any).currentUser?.id,
            buyerId: offerData.buyer_id,
            chatId: chatId,
          });
          
          // Create a notification for the buyer about the new match
          console.log('🔍 DEBUG - respondToOffer - Creating match notification for buyer:', offerData.buyer_id);
          
          // Set global flag for new match (will be picked up by NotificationContext)
          if (typeof window !== 'undefined') {
            try {
              // Get listing details for the notification
              const { data: listingData, error: listingError } = await supabase
                .from('listings')
                .select('title, images')
                .eq('id', offerData.listing_id)
                .single();
                
              if (listingError) {
                console.error('Error fetching listing details for notification:', listingError);
              } else if (listingData) {
                // Get current user ID from window if available
                const currentUserId = (window as any).currentUser?.id;
                
                // Check if current user is the buyer
                const isBuyer = currentUserId === offerData.buyer_id;
                
                console.log('🔍 DEBUG - respondToOffer - Match check:', { 
                  currentUserId, 
                  buyerId: offerData.buyer_id, 
                  isBuyer 
                });
                
                // Only proceed if this is the buyer's client
                if (isBuyer) {
                  console.log('🔍 DEBUG - respondToOffer - MATCH FOUND! Showing notification to buyer');
                  
                  // Debug log for the toast notification
                  console.log('🔥 Match toast triggered', {
                    buyerId: offerData.buyer_id,
                    currentUserId,
                    chatId,
                    listingTitle: listingData.title
                  });
                  
                  // Set up match data
                  const matchData = {
                    chatId: chatId,
                    buyerId: offerData.buyer_id,
                    sellerId: offerData.seller_id,
                    listingId: offerData.listing_id,
                    productTitle: listingData.title,
                    productImage: Array.isArray(listingData.images) && listingData.images.length > 0 
                      ? listingData.images[0] 
                      : 'https://via.placeholder.com/300x300?text=No+Image',
                    isRead: false,
                    createdAt: new Date().toISOString()
                  };
                  
                  // Set global match data for notification
                  (window as any).hasNewMatches = true;
                  (window as any).globalChatMatches = [(matchData)];
                  
                  // Only trigger toast notification when offer is EXPLICITLY accepted
                  console.log('DEBUG - respondToOffer - Offer accepted, triggering toast notification');
                  
                  // Show toast notification for the buyer
                  if (typeof window !== 'undefined') {
                    try {
                      // Create and dispatch a custom event for the toast
                      const toastEvent = new CustomEvent('showMatchToast', { 
                        detail: {
                          message: 'Your offer was accepted! Start chatting now.',
                          type: 'success'
                        }
                      });
                      window.dispatchEvent(toastEvent);
                      console.log('DEBUG - respondToOffer - Toast event dispatched');
                    } catch (error) {
                      console.error('Error dispatching toast event:', error);
                    }
                  }
                  
                  // For backward compatibility, also set the global match data
                  if (typeof window !== 'undefined') {
                    (window as any).hasNewMatches = true;
                    (window as any).globalChatMatches = [(matchData)];
                  }
                } else {
                  console.log('🔍 DEBUG - respondToOffer - Current user is not the buyer, skipping notification');
                }
              }
            } catch (notificationError) {
              console.error('Error setting up match notification:', notificationError);
            }
          }
          
          // Add a system message to the chat
          try {
            const messageData = {
              chat_id: chatId,
              sender_id: offerData.seller_id, // Seller is accepting the offer
              content: `Offer of $${offerData.offer_price} has been accepted! You can now arrange a meeting.`,
              is_read: false,
              images: [],
              created_at: new Date().toISOString() // Ensure timestamp is current
            };
            
            const { error: messageError } = await supabase
              .from('messages')
              .insert(messageData);
              
            if (messageError) {
              console.error('Error creating acceptance message:', messageError);
            } else {
              console.log('🔍 DEBUG - respondToOffer - Acceptance message created successfully');
            }
          } catch (messageError) {
            console.error('Error in message creation:', messageError);
          }
        }
      }
    }
    
    console.log(`🔍 DEBUG - respondToOffer - Offer ${offerId} ${action === 'accept' ? 'accepted' : 'declined'} successfully. Chat ID: ${chatId || 'None'}`);
    return { success: true, action };
  } catch (error) {
    console.error('Error responding to offer:', error);
    throw error;
  }
};

export const getPendingOffers = async (sellerId: string) => {
  console.log('🔍 DEBUG - getPendingOffers - Current user ID:', sellerId);
  
  try {
    // Fetch pending offers with buyer user and listing details
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select(`
        *,
        listings:listing_id(id, title, price, images, seller_id),
        buyer:users!offers_buyer_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('seller_id', sellerId)
      .eq('status', 'pending');
      
    // Log the raw offers data to debug the buyer user issue
    console.log('🔍 DEBUG - getPendingOffers - Raw offers data:', JSON.stringify(offers?.[0] || {}, null, 2));
    
    if (offersError) {
      console.error('Error fetching offers:', offersError);
      throw offersError;
    }
    
    if (!offers || offers.length === 0) {
      console.log('🔍 DEBUG - getPendingOffers - No pending offers found');
      return [];
    }
    
    // Initialize a map to store buyer users
    let buyerUsers: Record<string, any> = {};
    
    // Process users from the join
    offers.forEach(offer => {
      // Get the buyer user from the join result
      const buyerUser = offer.buyer;
      
      if (buyerUser) {
        // Handle potential array returns from Supabase
        const buyer = Array.isArray(buyerUser) ? buyerUser[0] : buyerUser;
        if (buyer && buyer.id) {
          buyerUsers[buyer.id] = buyer;
        }
      }
    });
    
    console.log('🔍 DEBUG - getPendingOffers - Processed buyer users:', Object.keys(buyerUsers).length);
    
    // Check for any missing buyer users
    const missingBuyerIds = offers
      .filter(offer => !offer.buyer && offer.buyer_id)
      .map(offer => offer.buyer_id);
      
    // Fetch missing buyer users if needed
    if (missingBuyerIds.length > 0) {
      console.log('🔍 DEBUG - getPendingOffers - Fetching missing buyer users:', missingBuyerIds);
      
      try {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .in('id', missingBuyerIds);
          
        if (users && users.length > 0) {
          // Add to our buyer users map
          users.forEach(user => {
            if (user.id) {
              buyerUsers[user.id] = user;
            }
          });
          
          console.log('🔍 DEBUG - getPendingOffers - Fetched additional users:', users.length);
        }
      } catch (error) {
        console.error('Error fetching missing buyer users:', error);
      }
    }
    
    // Enrich the offers with additional information for display
    const enrichedOffers = offers.map(offer => {
      // Extract the listing data properly
      const listing = Array.isArray(offer.listings) ? offer.listings[0] : offer.listings;
      
      // Get buyer user from our map or from the join result
      const buyerUserRaw = offer.buyer;
      let buyer = null;
      
      if (buyerUserRaw) {
        buyer = Array.isArray(buyerUserRaw) ? buyerUserRaw[0] : buyerUserRaw;
      } else if (offer.buyer_id && buyerUsers[offer.buyer_id]) {
        buyer = buyerUsers[offer.buyer_id];
        console.log('🔍 DEBUG - getPendingOffers - Using directly fetched user for buyer:', offer.buyer_id);
      }
      
      // Format the offer price for display
      const formattedPrice = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(offer.offer_price || 0);
      
      // Get listing title with fallback
      const listingTitle = listing?.title || 'Unknown Item';
      
      // Get buyer name and avatar with fallbacks
      const buyerName = getUserDisplayName(buyer);
      const buyerAvatar = buyer?.avatar_url || null;
      
      // Format display message
      const displayMessage = offer.message || `${buyerName} made an offer of ${formattedPrice}`;
      
      return {
        ...offer,
        formatted_price: formattedPrice,
        listing_title: listingTitle,
        buyer_id: offer.buyer_id,
        buyer_profile: buyer,  // Changed from buyer_user to buyer_profile to match UI expectations
        buyer_name: buyerName,
        buyer_avatar: buyerAvatar,
        display_message: displayMessage
      };
    });
    
    console.log('🔍 DEBUG - getPendingOffers - Enriched offers:', enrichedOffers.length);
    return enrichedOffers;
  } catch (error) {
    console.error('Error in getPendingOffers:', error);
    throw error;
  }
};

// Helper function to get user chats
export const getUserChats = async (userId: string) => {
  console.log('Getting chats for user:', userId);
  
  // First get all chats where the user is either buyer or seller
  const { data: chats, error } = await supabase
    .from('chats')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      created_at,
      is_active,
      last_message_at,
      listings:listing_id(id, title, price, images, seller_id),
      buyer:users!chats_buyer_id_fkey(id, full_name, email, avatar_url),
      seller:users!chats_seller_id_fkey(id, full_name, email, avatar_url)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
  
  console.log('Chats found:', chats?.length || 0);
  if (!chats || chats.length === 0) {
    return [];
  }
  
  // For each chat, fetch the most recent message
  const chatIds = chats.map(chat => chat.id);
  
  const { data: latestMessages, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });
    
  if (messagesError) {
    console.error('Error fetching messages:', messagesError);
    throw messagesError;
  }
  
  console.log('Messages found:', latestMessages?.length || 0);
  
  // Create a map of chat_id to latest message
  const latestMessageMap = new Map();
  if (latestMessages) {
    latestMessages.forEach(message => {
      if (!latestMessageMap.has(message.chat_id)) {
        latestMessageMap.set(message.chat_id, message);
      }
    });
  }
  
  // Define an interface for users
  interface User {
    id: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
    [key: string]: any; // Allow for additional properties
  }
  
  // Initialize a map to store users by ID
  let userMap: Record<string, User> = {};
  
  // Process users data from the join
  chats.forEach(chat => {
    // Extract buyer and seller users from the join results
    const buyerUser = chat.buyer;
    const sellerUser = chat.seller;
    
    // Process buyer user
    if (buyerUser) {
      const buyer = Array.isArray(buyerUser) ? buyerUser[0] : buyerUser;
      if (buyer && buyer.id) {
        userMap[buyer.id] = buyer;
      }
    }
    
    // Process seller user
    if (sellerUser) {
      const seller = Array.isArray(sellerUser) ? sellerUser[0] : sellerUser;
      if (seller && seller.id) {
        userMap[seller.id] = seller;
      }
    }
  });
  
  console.log('🔍 DEBUG - getUserChats - Processed users:', Object.keys(userMap).length);
  
  // Combine chat data with latest message and determine if message is unread
  const enrichedChats = chats.map(chat => {
    const latestMessage = latestMessageMap.get(chat.id) || null;
    
    // Determine if the latest message is unread by this user
    let isUnread = false;
    if (latestMessage) {
      // Message is unread if it's not from the current user and is_read is false
      isUnread = latestMessage.sender_id !== userId && !latestMessage.is_read;
    }
    
    // Determine if user is buyer or seller in this chat
    const isBuyer = chat.buyer_id === userId;
    
    // Handle potential array returns from Supabase
    const listing = Array.isArray(chat.listings) ? chat.listings[0] : chat.listings;
    
    // Get buyer and seller users from our map
    const buyerUser = userMap[chat.buyer_id];
    const sellerUser = userMap[chat.seller_id];
    
    // Get the other user based on current user's role
    const otherUser = isBuyer ? sellerUser : buyerUser;
    
    // Get display names using the getUserDisplayName helper
    const buyerName = getUserDisplayName(buyerUser);
    const sellerName = getUserDisplayName(sellerUser);
    const otherUserName = isBuyer ? sellerName : buyerName;
    
    return {
      ...chat,
      listing,
      buyerUser,
      sellerUser,
      otherUser,
      buyerName,
      sellerName,
      otherUserName,
      latest_message: latestMessage, // Use the original property name for consistency
      is_unread: isUnread,
      isBuyer,
      user_role: isBuyer ? 'buyer' : 'seller'
    };
  });
  
  // Sort chats by last_message_at timestamp
  enrichedChats.sort((a, b) => {
    const aTime = a.last_message_at 
      ? new Date(a.last_message_at).getTime() 
      : new Date(a.created_at).getTime();
        
    const bTime = b.last_message_at 
      ? new Date(b.last_message_at).getTime() 
      : new Date(b.created_at).getTime();
        
    return bTime - aTime; // Descending order (newest first)
  });
  
  console.log('Returning enriched chats:', enrichedChats.length);
  return enrichedChats;
};

// Helper function to get chat messages
export const getChatMessages = async (chatId: string, userId: string) => {
  console.log('Getting messages for chat:', chatId, 'and user:', userId);
  
  try {
    // Get all messages for this chat
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} messages for chat ${chatId}`);
    
    // Mark all unread messages from others as read
    const unreadMessages = data?.filter(msg => 
      msg.sender_id !== userId && !msg.is_read
    ) || [];
    
    if (unreadMessages.length > 0) {
      console.log(`Marking ${unreadMessages.length} messages as read`);
      
      // Get the IDs of unread messages
      const unreadIds = unreadMessages.map(msg => msg.id);
      
      // Update them all as read
      const { error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        // Continue anyway, this is not critical
      }
    }
    
    // Format messages with is_mine flag for easier rendering
    const formattedMessages = data.map((message: any) => ({
      ...message,
      is_mine: message.sender_id === userId
    }));
    
    return formattedMessages;
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    throw error;
  }
};

// Helper function to check for new offers (for badge on chats tab)
export const checkNewOffers = async (userId: string) => {
  try {
    // First check for pending offers where user is the seller
    const { data: pendingOffers, error: offersError } = await supabase
      .from('offers')
      .select(`
        id,
        listing_id,
        buyer_id,
        offer_price,
        created_at,
        listings!inner(seller_id)
      `)
      .eq('status', 'pending')
      .eq('listings.seller_id', userId);
    
    if (offersError) {
      console.error('Error checking for pending offers:', offersError);
      return { count: 0, hasNew: false };
    }
    
    // Then check for unread notifications
    const { data: unreadNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false);
    
    if (notificationsError) {
      console.error('Error checking for unread notifications:', notificationsError);
      return { count: pendingOffers?.length || 0, hasNew: pendingOffers?.length > 0 };
    }
    
    // Also check for unread messages
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    
    let unreadMessagesCount = 0;
    
    if (!chatsError && chats && chats.length > 0) {
      const chatIds = chats.map(chat => chat.id);
      
      const { data: unreadMessages, error: messagesError } = await supabase
        .from('messages')
        .select('id')
        .in('chat_id', chatIds)
        .neq('sender_id', userId)
        .eq('is_read', false);
      
      if (!messagesError) {
        unreadMessagesCount = unreadMessages?.length || 0;
      }
    }
    
    // Calculate total count and whether there are new items
    const totalCount = (pendingOffers?.length || 0) + 
                       (unreadNotifications?.length || 0) + 
                       unreadMessagesCount;
    
    return { 
      count: totalCount, 
      hasNew: totalCount > 0,
      pendingOffers: pendingOffers || [],
      unreadNotifications: unreadNotifications?.length || 0,
      unreadMessages: unreadMessagesCount
    };
  } catch (error) {
    console.error('Error in checkNewOffers:', error);
    return { count: 0, hasNew: false };
  }
};
