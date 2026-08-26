import { passwordRuleError, validateLogin, validateRegister } from '@/lib/auth/authValidation';

describe('validateLogin', () => {
  it('requires email and password', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Email is required',
      password: 'Password is required',
    });
  });

  it('passes when both fields are filled', () => {
    expect(validateLogin({ email: 'a@b.com', password: 'x' })).toEqual({});
  });
});

describe('validateRegister', () => {
  const valid = {
    username: 'pavel',
    email: 'pavel@example.com',
    password: 'Secret1!',
    confirmPassword: 'Secret1!',
  };

  it('requires empty fields', () => {
    expect(
      validateRegister({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    ).toEqual({
      email: 'Email is required',
      username: 'Username is required',
      password: 'Password is required',
      confirmPassword: 'Confirm your password',
    });
  });

  it('rejects bad email and short username', () => {
    expect(
      validateRegister({
        ...valid,
        email: 'not-an-email',
        username: 'ab',
      })
    ).toMatchObject({
      email: 'Enter a correct email address',
      username: 'Username must be at least 3 characters',
    });
  });

  it('enforces password rules', () => {
    expect(validateRegister({ ...valid, password: 'short', confirmPassword: 'short' })).toMatchObject(
      {
        password: 'Password must be at least 8 characters long',
      }
    );
    expect(
      validateRegister({ ...valid, password: 'noupper1!', confirmPassword: 'noupper1!' })
    ).toMatchObject({
      password: 'Must contain uppercase letter',
    });
    expect(
      validateRegister({ ...valid, password: 'NoDigit!!', confirmPassword: 'NoDigit!!' })
    ).toMatchObject({
      password: 'Must contain a digit',
    });
    expect(
      validateRegister({ ...valid, password: 'NoSpecial1', confirmPassword: 'NoSpecial1' })
    ).toMatchObject({
      password: 'Must contain a special character',
    });
  });

  it('rejects password mismatch', () => {
    expect(
      validateRegister({
        ...valid,
        confirmPassword: 'Other1!',
      })
    ).toMatchObject({
      confirmPassword: 'Passwords do not match',
    });
  });

  it('passes a valid payload', () => {
    expect(validateRegister(valid)).toEqual({});
  });
});

describe('passwordRuleError', () => {
  it('requires lowercase', () => {
    expect(passwordRuleError('NOLOWER1!')).toBe('Must contain lowercase letter');
  });

  it('accepts a strong password', () => {
    expect(passwordRuleError('Secret1!')).toBe('');
  });
});
