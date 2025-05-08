import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * ChatRedirect component
 * Redirects chat routes to the appropriate location in the app structure
 */
export default function ChatRedirect() {
  const params = useLocalSearchParams();
  
  return (
    <Redirect 
      href={{
        pathname: '/(app)/chat/[id]',
        params: { ...params }
      }} 
    />
  );
}
