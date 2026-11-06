import { Redirect, type Href } from 'expo-router';
import { useAuth } from '@/core/auth/AuthContext';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Redirect href={'/(main)/(tabs)/active' as Href} />;
  }

  return <Redirect href={'/(auth)/login' as Href} />;
}
