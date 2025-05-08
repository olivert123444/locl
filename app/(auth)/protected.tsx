import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return null; // Show loading state
  }

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  return <>{children}</>;
}
