import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { toastForError } from '@/lib/networkError';
import Heading from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Linking from '@/components/ui/Linking';
import AuthLayout, { LoggingInOverlay } from '@/components/ui/AuthLayout';

export default function LoginScreen() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const { signIn } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ registered?: string }>();

  useEffect(() => {
    if (params.registered === '1') {
      showToast('Account created. You can now log in.');
    }
  }, [params.registered, showToast]);

  const validate = (vals: typeof values) => {
    const temp: Record<string, string> = {};
    if (!vals.email) temp.email = 'Email is required';
    if (!vals.password) temp.password = 'Password is required';
    return temp;
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length !== 0) return false;

    setLoggingIn(true);

    const { error } = await signIn(values.email, values.password);

    if (error) {
      setLoggingIn(false);
      showToast(toastForError(error, error), 'error');
      return false;
    }

    router.replace('/(main)/(tabs)/active' as Href);
    return false;
  };

  return (
    <AuthLayout gap={48} overlay={loggingIn ? <LoggingInOverlay /> : null}>
      <Heading title="Welcome Back" text="Sign in to manage your tasks" />
      <Field
        innerText="Enter your email"
        Icon={Mail}
        id="email"
        type="email"
        label="Email"
        value={values.email}
        onChangeText={(text) => {
          setValues((prev) => ({ ...prev, email: text }));
          setErrors((prev) => ({ ...prev, email: '' }));
        }}
        error={submitted ? errors.email : ''}
      />
      <Field
        innerText="Enter your password"
        Icon={Lock}
        id="password"
        type="password"
        label="Password"
        value={values.password}
        onChangeText={(text) => {
          setValues((prev) => ({ ...prev, password: text }));
          setErrors((prev) => ({ ...prev, password: '' }));
        }}
        error={submitted ? errors.password : ''}
      />
      <Button inner="Sign in" onPress={handleSubmit} />
      <Linking to={'/(auth)/register' as Href} innerText="Don't have an account? Sign up" />
    </AuthLayout>
  );
}
