import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the likes tab (swipe) which is our main screen
  return <Redirect href="/(tabs)/swipe" />;
}
