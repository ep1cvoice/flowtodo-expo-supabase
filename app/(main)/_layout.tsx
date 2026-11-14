import { View, StyleSheet } from 'react-native';
import { Redirect, Stack, type Href } from 'expo-router';
import { taskStore } from '@/features/tasks/lib/store';
import OfflineBanner from '@/shared/ui/OfflineBanner';
import { useAuth } from '@/core/auth/AuthContext';

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Redirect href={'/(auth)/login' as Href} />;
  }

  return (
    <View style={styles.root}>
      {/* Local-first (native) shows connectivity in the sync button instead of a banner. */}
      {taskStore.localFirst ? null : <OfflineBanner />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
