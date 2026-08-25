import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useKeyboardHeight } from '@/lib/useKeyboardBottomInset';

export function UnlockGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, dek, loading, unlock, logout, isAuthenticating } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const keyboardInset = useKeyboardHeight();
  const keyboardOpen = keyboardInset > 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const needsUnlock = isAuthenticated && dek === null && !isAuthenticating;
  if (!needsUnlock) {
    return <>{children}</>;
  }

  const handleUnlock = async () => {
    if (!password) return;
    setSubmitting(true);
    setError(null);
    const { error } = await unlock(password);
    if (error) {
      setError(error);
    } else {
      setPassword('');
    }
    setSubmitting(false);
  };

  const handleLogout = async () => {
    setPassword('');
    setError(null);
    await logout();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.container,
        keyboardOpen && styles.containerKeyboard,
        keyboardOpen && { paddingBottom: keyboardInset + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Odblokuj FlowTodo</Text>
      <Text style={styles.subtitle}>Podaj hasło, aby odszyfrować swoje dane</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="password"
        importantForAutofill="no"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleUnlock}
        placeholder="Hasło"
        editable={!submitting}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleUnlock}
        disabled={submitting || !password}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Odblokuj</Text>}
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={handleLogout} disabled={submitting}>
        <Text style={styles.logoutText}>Wyloguj się</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  containerKeyboard: { flexGrow: 0, justifyContent: 'flex-start' },
  title: { fontSize: 22, fontWeight: '600', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: { color: '#dc2626', textAlign: 'center' },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  logoutButton: {
    marginTop: 4,
    padding: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
});
