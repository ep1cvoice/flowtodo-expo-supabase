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

  if (!values.password) errors.password = 'Password is required';
  else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else if (!/[a-z]/.test(values.password)) {
    errors.password = 'Must contain lowercase letter';
  } else if (!/[A-Z]/.test(values.password)) {
    errors.password = 'Must contain uppercase letter';
  } else if (!/[0-9]/.test(values.password)) {
    errors.password = 'Must contain a digit';
  } else if (!/[!@#$%^&*()_\-+=[\]{};:'",.<>/?`~|]/.test(values.password)) {
    errors.password = 'Must contain a special character';
  }

  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password';
  else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
}
