import { strings } from '@/shared/lib/strings';
import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: strings.nav.notFoundHeader, headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.title}>{strings.nav.notFoundMessage}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{strings.nav.goHome}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.bgContent,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
  },
});
