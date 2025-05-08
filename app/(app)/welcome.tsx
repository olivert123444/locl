import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Locl</Text>
      <Text style={styles.subtitle}>Your local marketplace</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/(app)/swipe')}
        >
          <Text style={styles.buttonText}>Go to Swipe</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => router.push('/(app)/profile')}
        >
          <Text style={styles.buttonText}>Go to Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#007AFF'
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
