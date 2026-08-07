import { useMemo, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import Heading from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Linking from '@/components/ui/Linking';
import AuthLayout from '@/components/ui/AuthLayout';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function RegisterScreen() {
  const [values, setValues] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(), [colors]);
  const { signUp } = useAuth();

  const validate = (vals: typeof values) => {
    const temp: Record<string, string> = {};

    if (!vals.email) temp.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(vals.email)) temp.email = 'Enter a correct email address';

    if (!vals.username) temp.username = 'Username is required';
    else if (vals.username.length < 3) temp.username = 'Username must be at least 3 characters';

    if (!vals.password) temp.password = 'Password is required';
    else if (vals.password.length < 8) temp.password = 'Password must be at least 8 characters long';
    else if (!/[a-z]/.test(vals.password)) temp.password = 'Must contain lowercase letter';
    else if (!/[A-Z]/.test(vals.password)) temp.password = 'Must contain uppercase letter';
    else if (!/[0-9]/.test(vals.password)) temp.password = 'Must contain a digit';
    else if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>/?`~|]/.test(vals.password))
      temp.password = 'Must contain a special character';

    if (!vals.confirmPassword) temp.confirmPassword = 'Confirm your password';
    else if (vals.password !== vals.confirmPassword) temp.confirmPassword = 'Passwords do not match';

    return temp;
  };

  const setField = (key: keyof typeof values, text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length !== 0) return false;

    setSubmitting(true);
    const { error } = await signUp(values.email, values.password, values.username);
    setSubmitting(false);

    if (error) {
      showToast(error, 'error');
      return false;
    }

    router.replace({ pathname: '/(auth)/login', params: { registered: '1' } } as Href);
    return false;
  };

  return (
    <AuthLayout gap={32}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Heading title="Create Account" text="Sign up to get started" />

        <Field
          innerText="Enter your email"
          Icon={Mail}
          type="email"
          label="Email"
          value={values.email}
          onChangeText={(t) => setField('email', t)}
          error={submitted ? errors.email : ''}
        />

        <Field
          innerText="Enter your username"
          Icon={User}
          type="text"
          label="Username"
          value={values.username}
          onChangeText={(t) => setField('username', t)}
          error={submitted ? errors.username : ''}
          autoCapitalize="none"
        />

        <Field
          innerText="Enter your password"
          Icon={Lock}
          type="password"
          label="Password"
          value={values.password}
          onChangeText={(t) => setField('password', t)}
          error={submitted ? errors.password : ''}
        />

        <Field
          innerText="Confirm your password"
          Icon={Lock}
          type="password"
          label="Confirm password"
          value={values.confirmPassword}
          onChangeText={(t) => setField('confirmPassword', t)}
          error={submitted ? errors.confirmPassword : ''}
        />

        <Button inner={submitting ? 'Creating…' : 'Create account'} onPress={handleSubmit} />
        <Linking to={'/(auth)/login' as Href} innerText="Already have an account? Sign in" />
      </ScrollView>
    </AuthLayout>
  );
}

function createStyles() {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
      width: '100%',
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      gap: 32,
      paddingBottom: 24,
    },
  });
}
