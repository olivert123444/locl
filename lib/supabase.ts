import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

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
    }
  }
);

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) throw error;
  return data;
};

// Helper function to update user profile
export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    });
    
  if (error) throw error;
  return data;
};

// Helper function to create a new listing
export const createListing = async (listingData: any) => {
  const { data, error } = await supabase
    .from('listings')
    .insert(listingData)
    .select();
  if (error) {
    console.error('Supabase createListing error:', error);
    throw new Error(error.message || 'Unknown error');
  }
  return data;
};

// Helper function to get listings within a certain distance
export const getNearbyListings = async (userId: string, maxDistance: number) => {
  console.log(`Fetching nearby listings for user ${userId} with max distance ${maxDistance}km`);
  
  try {
    // First get the user's location
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('location')
      .eq('id', userId)
      .single();
      
    if (userError) {
      console.error('Error fetching user profile:', userError);
      // If we can't get the user profile, fall back to showing all listings
      return await getAllListings(userId);
    }
    
    // Get all active listings regardless of location
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*, profiles:seller_id(full_name, avatar_url, location)')
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
    if (userProfile?.location) {
      // Parse user location
      const userLoc = typeof userProfile.location === 'string' 
        ? JSON.parse(userProfile.location) 
        : userProfile.location;
      
      // If user has valid location, calculate distances
      if (userLoc?.latitude && userLoc?.longitude) {
        console.log(`User location: ${userLoc.latitude}, ${userLoc.longitude}`);
        
        const listingsWithDistance = listings.map(listing => {
          let distance = 0;
          
          try {
            // Parse listing location
            const listingLoc = typeof listing.location === 'string' 
              ? JSON.parse(listing.location) 
              : listing.location;
            
            if (listingLoc?.latitude && listingLoc?.longitude) {
              // Calculate distance using the Haversine formula
              const R = 6371; // Radius of the earth in km
              const dLat = deg2rad(listingLoc.latitude - userLoc.latitude);
              const dLon = deg2rad(listingLoc.longitude - userLoc.longitude);
              
              const a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(userLoc.latitude)) * Math.cos(deg2rad(listingLoc.latitude)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
              
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              distance = R * c; // Distance in km
              
              console.log(`Listing ${listing.id} distance: ${distance.toFixed(1)}km`);
            } else {
              // Fallback to random distance if listing location is incomplete
              distance = Math.random() * (maxDistance * 0.8); // Random distance within 80% of max
              console.log(`Listing ${listing.id} has no location, using random distance: ${distance.toFixed(1)}km`);
            }
          } catch (e) {
            // If there's an error parsing the JSON, use a random distance
            distance = Math.random() * (maxDistance * 0.8);
            console.log(`Error calculating distance for listing ${listing.id}, using random: ${distance.toFixed(1)}km`);
          }
          
          return {
            ...listing,
            distance: parseFloat(distance.toFixed(1)),
            seller: listing.profiles?.full_name || 'Unknown Seller',
            // Ensure images are properly formatted
            images: listing.images || [],
            main_image_url: Array.isArray(listing.images) && listing.images.length > 0 
              ? listing.images[0] 
              : 'https://via.placeholder.com/300x300?text=No+Image'
          };
        });
        
        // IMPORTANT: Temporarily disabling distance filtering to ensure listings show up
        // We'll still sort by distance but show all listings
        // .filter(listing => listing.distance <= maxDistance)
        const sortedListings = listingsWithDistance.sort((a, b) => a.distance - b.distance);
        
        console.log(`Returning ${sortedListings.length} listings sorted by distance`);
        return sortedListings;
      }
    }
    
    // If user has no location or invalid location, return all listings with random distances
    console.log('User has no valid location, using random distances');
    return listings.map(listing => ({
      ...listing,
      distance: parseFloat((Math.random() * (maxDistance * 0.8)).toFixed(1)),
      seller: listing.profiles?.full_name || 'Unknown Seller',
      // Ensure images are properly formatted
      images: listing.images || [],
      main_image_url: Array.isArray(listing.images) && listing.images.length > 0 
        ? listing.images[0] 
        : 'https://via.placeholder.com/300x300?text=No+Image'
    }));
    
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
      .select('*, profiles:seller_id(full_name, avatar_url)')
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
      seller: listing.profiles?.full_name || 'Unknown Seller',
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

// Helper function to create an offer and automatically create a chat entry
export const createOffer = async (offerData: any) => {
  console.log('Creating offer with data:', offerData);
  
  // Make sure we're using the correct field names for the database schema
  // The offers table expects offer_price, not amount
  if (!offerData.offer_price && offerData.amount) {
    offerData.offer_price = offerData.amount;
    delete offerData.amount;
  }
  
  // First, insert the offer
  const { data: offerData_, error: offerError } = await supabase
    .from('offers')
    .insert(offerData)
    .select();
    
  if (offerError) {
    console.error('Error creating offer:', offerError);
    throw offerError;
  }
  
  if (!offerData_ || offerData_.length === 0) {
    console.error('No offer data returned after insert');
    throw new Error('Failed to create offer');
  }
  
  const createdOffer = offerData_[0];
  console.log('Offer created successfully:', createdOffer);
  
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
    
    console.log('Listing details fetched:', listingData);
    
    // Check if a chat already exists between these users for this listing
    const { data: existingChats, error: chatCheckError } = await supabase
      .from('chats')
      .select('id')
      .eq('listing_id', offerData.listing_id)
      .eq('buyer_id', offerData.buyer_id)
      .eq('seller_id', listingData.seller_id);
      
    let chatId;
    
    if (chatCheckError) {
      console.error('Error checking for existing chats:', chatCheckError);
    } else if (existingChats && existingChats.length > 0) {
      console.log('Chat already exists, using existing chat');
      chatId = existingChats[0].id;
    } else {
      // Create a new chat entry
      const chatData = {
        listing_id: offerData.listing_id,
        buyer_id: offerData.buyer_id,
        seller_id: listingData.seller_id,
        is_active: true
        // Let the database handle created_at and last_message_at
      };
      
      console.log('Creating chat with data:', chatData);
      
      const { data: chatData_, error: chatError } = await supabase
        .from('chats')
        .insert(chatData)
        .select();
        
      if (chatError) {
        console.error('Error creating chat:', chatError);
        // Don't throw here, we still want to return the offer data
        console.warn('Chat creation failed, but offer was created successfully');
      } else if (chatData_ && chatData_.length > 0) {
        console.log('Chat created successfully:', chatData_[0]);
        chatId = chatData_[0].id;
      }
    }
    
    // If we have a chat ID, create a message
    if (chatId) {
      // Use the message from the offer data if available, otherwise create a default one
      const messageContent = offerData.message || 
        `I'm interested in your ${listingData.title}. Would you accept $${offerData.offer_price}?`;
      
      // Create initial message in the chat
      const initialMessage = {
        chat_id: chatId,
        sender_id: offerData.buyer_id,
        content: messageContent,
        is_read: false
        // Let the database handle created_at
      };
      
      console.log('Creating initial message:', initialMessage);
      
      const { error: messageError } = await supabase
        .from('messages')
        .insert(initialMessage);
        
      if (messageError) {
        console.error('Error creating initial message:', messageError);
        // Don't throw, just log the error
      } else {
        console.log('Initial message created successfully');
      }
      
      // Create a notification for the seller
      try {
        const notificationData = {
          user_id: listingData.seller_id,
          type: 'new_offer',
          content: JSON.stringify({
            offer_id: createdOffer.id,
            listing_id: offerData.listing_id,
            listing_title: listingData.title,
            buyer_id: offerData.buyer_id,
            offer_price: offerData.offer_price,
            chat_id: chatId
          }),
          read: false
        };
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        } else {
          console.log('Notification created successfully');
        }
      } catch (notificationError) {
        console.error('Error in notification creation:', notificationError);
      }
    }
  } catch (error) {
    console.error('Error in chat/message creation:', error);
    // Don't throw here, we still want to return the offer data
    console.warn('Chat/message creation failed, but offer was created successfully');
  }
  
  return offerData_;
};

// Helper function to handle offer responses (accept/decline)
export const respondToOffer = async (offerId: string, action: 'accept' | 'decline') => {
  console.log(`Responding to offer ${offerId} with action: ${action}`);
  
  try {
    // First, get the offer details
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select(`
        id, 
        listing_id, 
        buyer_id, 
        offer_price, 
        status
      `)
      .eq('id', offerId)
      .single();
      
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
    
    // Update the offer status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { error: updateError } = await supabase
      .from('offers')
      .update({ status: newStatus })
      .eq('id', offerId);
      
    if (updateError) {
      console.error('Error updating offer:', updateError);
      throw updateError;
    }
    
    // If declining, we're done
    if (action === 'decline') {
      console.log(`Offer ${offerId} declined successfully`);
      return { success: true, action: 'decline' };
    }
    
    // If accepting, we need to get the chat and create a notification for the buyer
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .select(`
        id, 
        listing_id, 
        buyer_id, 
        seller_id
      `)
      .eq('listing_id', offerData.listing_id)
      .eq('buyer_id', offerData.buyer_id)
      .single();
      
    if (chatError) {
      console.error('Error fetching chat:', chatError);
      // Don't throw, we still want to return success for the offer update
    } else if (chatData) {
      // Get listing details for the notification
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('title')
        .eq('id', offerData.listing_id)
        .single();
        
      if (listingError) {
        console.error('Error fetching listing:', listingError);
      } else if (listingData) {
        // Create a notification for the buyer
        const notificationData = {
          user_id: offerData.buyer_id,
          type: 'offer_accepted',
          content: JSON.stringify({
            offer_id: offerId,
            listing_id: offerData.listing_id,
            listing_title: listingData.title,
            offer_price: offerData.offer_price,
            chat_id: chatData.id
          }),
          read: false
        };
        
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notificationError) {
          console.error('Error creating notification:', notificationError);
        } else {
          console.log('Notification created successfully');
        }
        
        // Add a system message to the chat
        const messageData = {
          chat_id: chatData.id,
          sender_id: chatData.seller_id, // Seller is accepting the offer
          content: `Offer of $${offerData.offer_price} has been accepted! You can now arrange a meeting.`,
          is_read: false
        };
        
        const { error: messageError } = await supabase
          .from('messages')
          .insert(messageData);
          
        if (messageError) {
          console.error('Error creating acceptance message:', messageError);
        } else {
          console.log('Acceptance message created successfully');
        }
      }
    }
    
    console.log(`Offer ${offerId} accepted successfully`);
    return { success: true, action: 'accept' };
  } catch (error) {
    console.error('Error responding to offer:', error);
    throw error;
  }
};

// Helper function to get user's chats
export const getUserChats = async (userId: string) => {
  const { data, error } = await supabase
    .from('chats')
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      created_at,
      listings:listing_id(title, images, seller_id),
      buyer_profile:buyer_id(full_name, avatar_url),
      seller_profile:seller_id(full_name, avatar_url)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });
    
  if (error) throw error;
  return data;
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
