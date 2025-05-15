import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the nearby tab which is our main screen
  return <Redirect href="/(tabs)/nearby" />;
}
