import { strings } from '@/shared/lib/strings';
import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import Heading from '@/shared/ui/Heading';
import Field from '@/shared/ui/Field';
import Button from '@/shared/ui/Button';
import Linking from '@/shared/ui/Linking';
import AuthLayout from '@/shared/ui/AuthLayout';
import { useAuth } from '@/core/auth/AuthContext';
import { useToast } from '@/shared/providers/ToastContext';
import { validateRegister } from '@/core/auth/authValidation';
import { toastForError } from '@/shared/lib/networkError';

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
      <Heading title={strings.auth.register.title} text={strings.auth.register.subtitle} />

      <Field
        innerText="Enter your email"
        Icon={Mail}
        type="email"
        label={strings.common.email}
        value={values.email}
        onChangeText={(t) => setField('email', t)}
        error={submitted ? errors.email : ''}
      />

      <Field
        innerText="Enter your username"
        Icon={User}
        type="text"
        label={strings.auth.register.username}
        value={values.username}
        onChangeText={(t) => setField('username', t)}
        error={submitted ? errors.username : ''}
        autoCapitalize="none"
      />

      <Field
        innerText="Enter your password"
        Icon={Lock}
        type="password"
        label={strings.common.password}
        value={values.password}
        onChangeText={(t) => setField('password', t)}
        error={submitted ? errors.password : ''}
      />

      <Field
        innerText="Confirm your password"
        Icon={Lock}
        type="password"
        label={strings.auth.register.confirmPassword}
        value={values.confirmPassword}
        onChangeText={(t) => setField('confirmPassword', t)}
        error={submitted ? errors.confirmPassword : ''}
      />

      <Button inner={submitting ? strings.auth.register.submitting : strings.auth.register.submit} onPress={handleSubmit} />
      <Linking to={'/(auth)/login' as Href} innerText="Already have an account? Sign in" />
    </AuthLayout>
  );
}
