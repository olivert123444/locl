import { Redirect } from 'expo-router';

/**
 * Chat Tab Component
 * 
 * Redirects to the chats screen which shows all user conversations
 * including offers made and received
 */
export default function ChatTab() {
  return <Redirect href="/(app)/chats" />;
}
