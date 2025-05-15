import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DevToolsIndex() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Development Tools</Text>
      <View style={styles.linkContainer}>
        <Link href="/dev-tools/offers-test" asChild>
          <Pressable style={styles.linkButton}>
            <Text style={styles.linkText}>Offers Test</Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  linkContainer: {
    gap: 12,
  },
  linkButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
