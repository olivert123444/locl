import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/supabase';
import AvatarUpload from '@/components/AvatarUpload';

export default function AvatarTestScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      const profileData = await getUserProfile(user.id);
      console.log('Profile data loaded:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdated = (newUrl: string) => {
    console.log('Avatar updated with new URL:', newUrl);
    setProfile(prev => ({
      ...prev,
      avatar_url: newUrl
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Avatar Upload Test</Text>
        <Text style={styles.subtitle}>
          This screen demonstrates the avatar upload component working correctly
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Default Size (80px)</Text>
        <View style={styles.avatarContainer}>
          {user ? (
            <AvatarUpload 
              userId={user.id}
              currentAvatarUrl={profile?.avatar_url}
              onAvatarUpdated={handleAvatarUpdated}
            />
          ) : (
            <Text>Please log in to test avatar upload</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Large Size (120px)</Text>
        <View style={styles.avatarContainer}>
          {user ? (
            <AvatarUpload 
              userId={user.id}
              currentAvatarUrl={profile?.avatar_url}
              size={120}
              onAvatarUpdated={handleAvatarUpdated}
            />
          ) : (
            <Text>Please log in to test avatar upload</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Small Size (50px)</Text>
        <View style={styles.avatarContainer}>
          {user ? (
            <AvatarUpload 
              userId={user.id}
              currentAvatarUrl={profile?.avatar_url}
              size={50}
              onAvatarUpdated={handleAvatarUpdated}
            />
          ) : (
            <Text>Please log in to test avatar upload</Text>
          )}
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          After testing, you can integrate this component into your profile screen
          by replacing the current avatar implementation with this component.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  infoSection: {
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});
