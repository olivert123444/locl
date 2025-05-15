import React from "react";
import { Redirect } from "expo-router";

/**
 * Messages Screen
 * 
 * This screen has been deprecated in favor of the Chats screen.
 * Redirects to the Chats screen to ensure consistent user experience.
 */
export default function MessagesScreen() {
  return <Redirect href="/(app)/chats" />;
}