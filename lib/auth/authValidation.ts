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
  if (password.length < 8) return 'Password must be at least 8 characters long';
  if (!/[a-z]/.test(password)) return 'Must contain lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Must contain uppercase letter';
  if (!/[0-9]/.test(password)) return 'Must contain a digit';
  if (!SPECIAL_CHAR.test(password)) return 'Must contain a special character';
  return '';
}

export function validatePassword(password: string, emptyMessage: string): string {
  if (!password) return emptyMessage;
  return passwordRuleError(password);
}

export function confirmPasswordError(password: string, confirmPassword: string): string {
  if (!confirmPassword) return 'Confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
}

export function validateLogin(values: LoginValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.email) errors.email = 'Email is required';
  if (!values.password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister(values: RegisterValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.email) errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(values.email)) {
    errors.email = 'Enter a correct email address';
  }

  if (!values.username) errors.username = 'Username is required';
  else if (values.username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
  }

  const passwordErr = validatePassword(values.password, 'Password is required');
  if (passwordErr) errors.password = passwordErr;

  const confirmErr = confirmPasswordError(values.password, values.confirmPassword);
  if (confirmErr) errors.confirmPassword = confirmErr;

  return errors;
}
