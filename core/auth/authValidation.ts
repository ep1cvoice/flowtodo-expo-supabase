import { strings } from '@/shared/lib/strings';
export type LoginValues = {
  email: string;
  password: string;
};

export type RegisterValues = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const SPECIAL_CHAR = /[!@#$%^&*()_\-+=[\]{};:'",.<>/?`~|]/;

export function passwordRuleError(password: string): string {
  if (password.length < 8) return strings.auth.validation.passwordMinLength;
  if (!/[a-z]/.test(password)) return strings.auth.validation.lowercase;
  if (!/[A-Z]/.test(password)) return strings.auth.validation.uppercase;
  if (!/[0-9]/.test(password)) return strings.auth.validation.digit;
  if (!SPECIAL_CHAR.test(password)) return strings.auth.validation.special;
  return '';
}

export function validatePassword(password: string, emptyMessage: string): string {
  if (!password) return emptyMessage;
  return passwordRuleError(password);
}

export function confirmPasswordError(password: string, confirmPassword: string): string {
  if (!confirmPassword) return strings.auth.validation.confirmRequired;
  if (password !== confirmPassword) return strings.auth.validation.passwordsMismatch;
  return '';
}

export function validateLogin(values: LoginValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.email) errors.email = strings.auth.validation.emailRequired;
  if (!values.password) errors.password = strings.auth.validation.passwordRequired;
  return errors;
}

export function validateRegister(values: RegisterValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email) errors.email = strings.auth.validation.emailRequired;
  else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = strings.auth.validation.emailInvalid;
  }

  if (!values.username) errors.username = strings.auth.validation.usernameRequired;
  else if (values.username.length < 3) {
    errors.username = strings.auth.validation.usernameMinLength;
  }

  const passwordErr = validatePassword(values.password, strings.auth.validation.passwordRequired);
  if (passwordErr) errors.password = passwordErr;

  const confirmErr = confirmPasswordError(values.password, values.confirmPassword);
  if (confirmErr) errors.confirmPassword = confirmErr;

  return errors;
}
