import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import Heading from '@/components/ui/Heading';
import Field from '@/components/ui/Field';
import Button from '@/components/ui/Button';
import Linking from '@/components/ui/Linking';
import AuthLayout from '@/components/ui/AuthLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { validateRegister } from '@/lib/auth/authValidation';
import { toastForError } from '@/lib/networkError';

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
  const { showToast } = useToast();
  const { signUp } = useAuth();

  const setField = (key: keyof typeof values, text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    const validationErrors = validateRegister(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length !== 0) return false;

    setSubmitting(true);
    const { error } = await signUp(values.email, values.password, values.username);
    setSubmitting(false);

    if (error) {
      showToast(toastForError(error, error), 'error');
      return false;
    }

    router.replace({ pathname: '/(auth)/login', params: { registered: '1' } } as Href);
    return false;
  };

  return (
    <AuthLayout gap={32}>
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
    </AuthLayout>
  );
}
