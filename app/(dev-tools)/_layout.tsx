import { Stack } from 'expo-router';

export default function DevToolsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Dev Tools',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="offers-test"
        options={{
          title: 'Offers Test',
          headerStyle: {
            backgroundColor: '#121212',
          },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}
