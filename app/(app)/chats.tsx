import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
// Temporarily removed getUserChats import to fix loading issues

// Define chat match interface
interface ChatMatch {
  id: string;
  productName: string;
  price: number;
  productImage: string;
  sellerName: string;
  lastMessage: string;
  time: string;
  unread: number;
}

// Define Supabase response types
interface SupabaseChat {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  listings?: {
    title?: string;
    price?: number;
    main_image_url?: string;
    seller_id?: string;
  };
  buyer_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
  seller_profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

// Initial empty chat/match data
let initialChatMatches: ChatMatch[] = [];

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<ChatMatch | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [chatData, setChatData] = useState<ChatMatch[]>(initialChatMatches);
  const [isLoading, setIsLoading] = useState(true);
  
  // Temporarily using mock data instead of fetching from Supabase
  useEffect(() => {
    const loadMockData = () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Use mock data instead of fetching from Supabase
        const mockChats: ChatMatch[] = [
          // You can add mock data here if needed
          // Example:
          // {
          //   id: '1',
          //   productName: 'Sample Product',
          //   price: 25,
          //   productImage: 'https://via.placeholder.com/150',
          //   sellerName: 'Sample Seller',
          //   lastMessage: 'This is a sample message',
          //   time: new Date().toLocaleDateString(),
          //   unread: 0
          // }
        ];
        
        // Check for any global matches that might have been added
        if (typeof window !== 'undefined' && (window as any).globalChatMatches) {
          setChatData([...(window as any).globalChatMatches]);
          // Reset the new matches flag
          (window as any).hasNewMatches = false;
        } else {
          setChatData(mockChats);
        }
      } catch (error) {
        console.error('Error loading mock data:', error);
        setChatData([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMockData();
    
    // Set up an interval to check for new matches
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).hasNewMatches) {
        loadMockData();
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [user]);

  const renderChatItem = ({ item }: { item: ChatMatch }) => (
    <TouchableOpacity 
      style={styles.chatItem}
      onPress={() => {
        setSelectedChat(item);
        setChatModalVisible(true);
      }}
    >
      <View style={styles.chatImageContainer}>
        <Image source={{ uri: item.productImage }} style={styles.chatImage} />
        {item.unread > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread}</Text>
          </View>
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.productName} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.chatTime}>{item.time}</Text>
        </View>
        <Text style={styles.sellerName}>{item.sellerName}</Text>
        <Text 
          style={[styles.lastMessage, item.unread > 0 && styles.unreadMessage]} 
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerButton} />
        <Text style={styles.headerTitle}>Chats</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <View style={styles.listWrapper}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.emptyText}>Loading chats...</Text>
          </View>
        ) : chatData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No chats yet</Text>
            <Text style={styles.emptySubtext}>Swipe right on items you're interested in to start chatting with sellers</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => router.push('/(app)/nearby')}
            >
              <Text style={styles.browseButtonText}>Browse Items</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chatData}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Chat Popup Modal */}
      <Modal
        visible={chatModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedChat && (
              <>
                {/* Chat Header */}
                <View style={styles.chatHeader}>
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => setChatModalVisible(false)}
                  >
                    <Ionicons name="chevron-down" size={24} color="#000" />
                  </TouchableOpacity>
                  <View style={styles.chatTitleContainer}>
                    <Image source={{ uri: selectedChat.productImage }} style={styles.chatTitleImage} />
                    <View style={styles.chatTitleInfo}>
                      <Text style={styles.chatTitleText} numberOfLines={1}>{selectedChat.productName}</Text>
                      <Text style={styles.chatSubtitleText}>{selectedChat.sellerName}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.optionsButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#000" />
                  </TouchableOpacity>
                </View>
                
                {/* Chat Messages */}
                <ScrollView style={styles.messagesContainer}>
                  <View style={styles.messageBubble}>
                    <Text style={styles.messageText}>Hello! I'm interested in your {selectedChat.productName}.</Text>
                    <Text style={styles.messageTime}>10:30 AM</Text>
                  </View>
                  
                  <View style={[styles.messageBubble, styles.otherMessageBubble]}>
                    <Text style={[styles.messageText, styles.otherMessageText]}>Hi there! Yes, it's still available.</Text>
                    <Text style={[styles.messageTime, styles.otherMessageTime]}>10:32 AM</Text>
                  </View>
                  
                  <View style={styles.messageBubble}>
                    <Text style={styles.messageText}>{selectedChat.lastMessage}</Text>
                    <Text style={styles.messageTime}>10:35 AM</Text>
                  </View>
                </ScrollView>
                
                {/* Message Input */}
                <KeyboardAvoidingView 
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                  style={styles.inputContainer}
                >
                  <TextInput
                    style={styles.textInput}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Type a message..."
                    multiline
                  />
                  <TouchableOpacity 
                    style={styles.sendButton}
                    onPress={() => {
                      // In a real app, this would send the message
                      setMessageText('');
                    }}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/nearby')}
        >
          <Ionicons name="location-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Nearby</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/likes')}
        >
          <Ionicons name="heart-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Likes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabItem, styles.activeTab]}
          onPress={() => router.push('/(app)/chats')}
        >
          <Ionicons name="chatbubble" size={24} color="#6C5CE7" />
          <Text style={[styles.tabText, styles.activeTabText]}>Chats</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => router.push('/(app)/profile')}
        >
          <Ionicons name="person-outline" size={24} color="#8E8E93" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listWrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  chatImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  sellerName: {
    fontSize: 14,
    color: '#6C5CE7',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#000',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  browseButton: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Chat Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    height: '75%',
    paddingTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 10,
  },
  chatTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  chatTitleImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  chatTitleInfo: {
    flex: 1,
  },
  chatTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatSubtitleText: {
    fontSize: 14,
    color: '#6C5CE7',
  },
  optionsButton: {
    padding: 10,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    backgroundColor: '#6C5CE7',
    borderRadius: 20,
    borderBottomRightRadius: 5,
    padding: 12,
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  otherMessageBubble: {
    backgroundColor: '#f0f0f0',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 5,
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  otherMessageText: {
    color: '#000',
  },
  messageTime: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  otherMessageTime: {
    color: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6C5CE7',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  tabText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C5CE7',
  },
  activeTabText: {
    color: '#6C5CE7',
  },
});
