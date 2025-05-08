import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Conversation = {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  listing_id: string;
  listing_title: string;
  listing_image?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      if (!user) return;
      
      console.log('Fetching conversations for user:', user.id);
      
      // Get all matches (both pending and accepted offers) for the user
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          listing_id,
          buyer_id,
          seller_id,
          status,
          created_at,
          listings(title, main_image_url, images),
          offers(amount)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      console.log('Matches query result:', matches?.length || 0, 'matches found');
      
      if (matchesError) throw matchesError;
      
      if (!matches || matches.length === 0) {
        // No matches yet, show sample data for development
        setConversations([
          {
            id: '1',
            other_user_id: '123',
            other_user_name: 'Jane Doe',
            listing_id: '456',
            listing_title: 'Vintage Chair',
            listing_image: 'https://picsum.photos/id/1/500/500',
            last_message: 'Is this still available?',
            last_message_time: new Date().toISOString(),
            unread_count: 2,
          },
          {
            id: '2',
            other_user_id: '789',
            other_user_name: 'John Smith',
            listing_id: '012',
            listing_title: 'Mountain Bike',
            listing_image: 'https://picsum.photos/id/2/500/500',
            last_message: 'Can you meet tomorrow?',
            last_message_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            unread_count: 0,
          },
        ]);
        setLoading(false);
        return;
      }
      
      // Process matches to get conversations
      const conversationsData = await Promise.all(
        matches.map(async (match) => {
          // Determine the other user in the conversation
          const otherUserId = match.buyer_id === user.id ? match.seller_id : match.buyer_id;
          
          // Get the other user's profile
          const { data: otherUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', otherUserId)
            .single();
          
          if (profileError) {
            console.error('Error fetching profile:', profileError);
          }
          
          // Get the last message in the conversation
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (messagesError) {
            console.error('Error fetching messages:', messagesError);
          }
          
          // Get unread count
          const { count, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('match_id', match.id)
            .eq('sender_id', otherUserId)
            .eq('read', false);
          
          if (countError) {
            console.error('Error fetching unread count:', countError);
          }
          
          // Get the last message for this match
          const { data: lastMessage, error: messageError } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          // Get listing details from the match - handle as a single object, not an array
          // The TypeScript error occurs because Supabase returns this in a nested format
          const listingDetails = match.listings && typeof match.listings === 'object' ? match.listings : null;
          
          // Safely access properties with optional chaining
          let listingTitle = 'Unknown Item';
          let listingImage = 'https://via.placeholder.com/300x300?text=No+Image';
          
          if (listingDetails) {
            // Access the title property safely
            if ('title' in listingDetails && typeof listingDetails.title === 'string') {
              listingTitle = listingDetails.title;
            }
            
            // Try to get an image URL from various possible sources
            if ('main_image_url' in listingDetails && typeof listingDetails.main_image_url === 'string') {
              listingImage = listingDetails.main_image_url;
            } else if ('images' in listingDetails && Array.isArray(listingDetails.images) && listingDetails.images.length > 0) {
              // Make sure we're getting a string from the images array
              const firstImage = listingDetails.images[0];
              if (typeof firstImage === 'string') {
                listingImage = firstImage;
              }
            }
          }
          
          console.log('Listing details for match', match.id, ':', { title: listingTitle, image: listingImage });
          
          // Determine if this is a new offer request (pending) or an ongoing conversation
          const isPendingOffer = match.status === 'pending';
          const isUserSeller = match.seller_id === user.id;
          
          // For pending offers to the seller, create a special message
          let lastMessageText = lastMessage?.content || 'Start chatting!';
          if (isPendingOffer && isUserSeller && !lastMessage) {
            const offerAmount = match.offers && match.offers[0] ? match.offers[0].amount : '?';
            lastMessageText = `New offer: $${offerAmount} - Tap to respond`;
          }
          
          // Format the conversation data
          return {
            id: match.id,
            other_user_id: otherUserId,
            other_user_name: otherUserProfile?.full_name || 'Unknown User',
            other_user_avatar: otherUserProfile?.avatar_url,
            listing_id: match.listing_id,
            listing_title: listingTitle,
            listing_image: listingImage || 'https://via.placeholder.com/300x300?text=No+Image',
            last_message: lastMessageText,
            last_message_time: lastMessage?.created_at || match.created_at,
            unread_count: isPendingOffer && isUserSeller ? 1 : 0, // Show unread indicator for new offers
            isPending: isPendingOffer
          };
        })
      );
      
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Show sample data for development
      setConversations([
        {
          id: '1',
          other_user_id: '123',
          other_user_name: 'Jane Doe',
          listing_id: '456',
          listing_title: 'Vintage Chair',
          listing_image: 'https://picsum.photos/id/1/500/500',
          last_message: 'Is this still available?',
          last_message_time: new Date().toISOString(),
          unread_count: 2,
        },
        {
          id: '2',
          other_user_id: '789',
          other_user_name: 'John Smith',
          listing_id: '012',
          listing_title: 'Mountain Bike',
          listing_image: 'https://picsum.photos/id/2/500/500',
          last_message: 'Can you meet tomorrow?',
          last_message_time: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          unread_count: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = (conversation: Conversation) => {
    router.push({
      pathname: '/(app)/chat/[id]',
      params: { 
        id: conversation.id,
        otherUserId: conversation.other_user_id,
        otherUserName: conversation.other_user_name,
        listingId: conversation.listing_id,
        listingTitle: conversation.listing_title
      }
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week, show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older, show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity 
      style={styles.conversationItem} 
      onPress={() => handleOpenChat(item)}
    >
      <View style={styles.avatarContainer}>
        {item.other_user_avatar ? (
          <Image source={{ uri: item.other_user_avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.other_user_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.userName}>{item.other_user_name}</Text>
          <Text style={styles.timeText}>{formatTime(item.last_message_time)}</Text>
        </View>
        
        <Text style={styles.listingTitle} numberOfLines={1}>
          Re: {item.listing_title}
        </Text>
        
        <View style={styles.messagePreviewContainer}>
          <Text 
            style={[
              styles.messagePreview, 
              item.unread_count > 0 && styles.unreadMessage
            ]} 
            numberOfLines={1}
          >
            {item.last_message}
          </Text>
          
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
      
      <Image 
        source={{ uri: item.listing_image || 'https://via.placeholder.com/50' }} 
        style={styles.listingImage} 
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={fetchConversations}>
          <Ionicons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            You don't have any messages yet.
          </Text>
          <Text style={styles.emptySubtext}>
            When you make offers on items or receive offers from buyers, your conversations will appear here.
          </Text>
          <TouchableOpacity 
            style={styles.browseButton} 
            onPress={() => router.push('/swipe')}
          >
            <Text style={styles.browseButtonText}>Browse Items</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  conversationContent: {
    flex: 1,
    marginRight: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#777',
  },
  listingTitle: {
    fontSize: 14,
    color: '#777',
    marginBottom: 4,
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  messagePreview: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listingImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
});
