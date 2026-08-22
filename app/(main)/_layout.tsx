import { View, StyleSheet } from 'react-native';
import { Redirect, Stack, type Href } from 'expo-router';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { Pbkdf2WebView } from '@/components/Pbkdf2WebView';
import { useAuth } from '@/context/AuthContext';

export default function MainLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Redirect href={'/(auth)/login' as Href} />;
  }

  return (
    <View style={styles.root}>
      {/* Newidoczne środowisko WebCrypto dla Expo Go */}
      <Pbkdf2WebView />
      <OfflineBanner />
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
