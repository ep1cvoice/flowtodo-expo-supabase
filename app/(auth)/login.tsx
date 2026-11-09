import { strings } from '@/shared/lib/strings';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Mail, Lock } from 'lucide-react-native';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/shared/providers/ToastContext';
import { validateLogin } from '@/core/auth/authValidation';
import { toastForError } from '@/shared/lib/networkError';
import Heading from '@/shared/ui/Heading';
import Field from '@/shared/ui/Field';
import Button from '@/shared/ui/Button';
import Linking from '@/shared/ui/Linking';
import AuthLayout, { LoggingInOverlay } from '@/shared/ui/AuthLayout';

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
      showToast(strings.auth.login.accountCreated);
    }
  }, [params.registered, showToast]);

  const handleSubmit = async () => {
    setSubmitted(true);
    const validationErrors = validateLogin(values);
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
      <Heading title={strings.auth.login.title} text={strings.auth.login.subtitle} />
      <Field
        innerText="Enter your email"
        Icon={Mail}
        id="email"
        type="email"
        label={strings.common.email}
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
        label={strings.common.password}
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
