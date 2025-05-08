import { Redirect, useLocalSearchParams } from 'expo-router';

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
