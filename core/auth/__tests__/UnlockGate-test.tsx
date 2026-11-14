import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { UnlockGate } from '@/core/auth/UnlockGate';

const mockUnlock = jest.fn();
const mockLogout = jest.fn();
const mockUnlockWithBiometrics = jest.fn();

const authState = {
  isAuthenticated: true,
  dek: null as Uint8Array | null,
  loading: false,
  isAuthenticating: false,
  // Wrappers resolve the mocks lazily (the mock factories run during import hoisting).
  unlock: (...args: unknown[]) => mockUnlock(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  unlockWithBiometrics: (...args: unknown[]) => mockUnlockWithBiometrics(...args),
  biometricUnlockAvailable: false,
  user: { id: 'u1' } as unknown,
};

jest.mock('@/core/auth/AuthContext', () => ({
  useAuth: () => authState,
}));
jest.mock('@/core/auth/EncryptionContext', () => ({
  useEncryption: () => authState,
}));

jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>('@/shared/constants/theme');
  return {
    useTheme: () => ({
      colors: lightColors,
      isDark: false,
      theme: 'light',
      setTheme: jest.fn(),
      ready: true,
    }),
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const Icon = () => <View />;
  return new Proxy(
    {},
    {
      get: () => Icon,
    }
  );
});

describe('<UnlockGate />', () => {
  beforeEach(() => {
    mockUnlock.mockReset();
    mockLogout.mockReset();
    mockUnlockWithBiometrics.mockReset();
    authState.biometricUnlockAvailable = false;
    authState.isAuthenticated = true;
    authState.dek = null;
    authState.loading = false;
    authState.isAuthenticating = false;
  });

  it('shows English unlock copy and does not unlock on empty password', async () => {
    const result = await render(
      <UnlockGate>
        <Text>SECRET_APP</Text>
      </UnlockGate>
    );

    expect(result.getByText('Unlock application')).toBeTruthy();
    expect(result.getByText('Enter your password to decrypt your data')).toBeTruthy();
    expect(result.getByText('Unlock')).toBeTruthy();
    expect(result.getByText('Log Out')).toBeTruthy();
    expect(result.queryByText('SECRET_APP')).toBeNull();

    fireEvent.press(result.getByText('Unlock'));
    expect(mockUnlock).not.toHaveBeenCalled();
  });

  it('keeps the login tree mounted while signing in without a DEK', async () => {
    authState.isAuthenticating = true;

    const result = await render(
      <UnlockGate>
        <Text>SECRET_APP</Text>
      </UnlockGate>
    );

    expect(result.getByText('SECRET_APP')).toBeTruthy();
    expect(result.queryByText('Unlock application')).toBeNull();
  });

  it('does not render the app when the session is locked', async () => {
    const result = await render(
      <UnlockGate>
        <Text>SECRET_APP</Text>
      </UnlockGate>
    );

    expect(result.queryByText('SECRET_APP')).toBeNull();
    expect(result.getByText('Unlock application')).toBeTruthy();
  });

  it('renders the app only after a DEK is present', async () => {
    authState.dek = new Uint8Array(32);

    const result = await render(
      <UnlockGate>
        <Text>SECRET_APP</Text>
      </UnlockGate>
    );

    expect(result.getByText('SECRET_APP')).toBeTruthy();
    expect(result.queryByText('Unlock application')).toBeNull();
  });

  describe('unlock flow', () => {
    const PLACEHOLDER = 'Enter your password';

    it('unlocks with the typed password and the current user', async () => {
      mockUnlock.mockResolvedValue({ error: null });
      const result = await render(<UnlockGate><Text>SECRET_APP</Text></UnlockGate>);

      await fireEvent.changeText(result.getByPlaceholderText(PLACEHOLDER), 'hunter2');
      await fireEvent.press(result.getByText('Unlock'));

      await waitFor(() => expect(mockUnlock).toHaveBeenCalledWith('hunter2', authState.user));
    });

    it('shows the unlock error and clears it when the user types again', async () => {
      mockUnlock.mockResolvedValue({ error: 'Wrong password' });
      const result = await render(<UnlockGate><Text>SECRET_APP</Text></UnlockGate>);

      await fireEvent.changeText(result.getByPlaceholderText(PLACEHOLDER), 'bad');
      await fireEvent.press(result.getByText('Unlock'));
      await waitFor(() => expect(result.getByText('Wrong password')).toBeTruthy());

      await fireEvent.changeText(result.getByPlaceholderText(PLACEHOLDER), 'bad2');
      expect(result.queryByText('Wrong password')).toBeNull();
    });

    it('logs out from the locked screen', async () => {
      mockLogout.mockResolvedValue(undefined);
      const result = await render(<UnlockGate><Text>SECRET_APP</Text></UnlockGate>);

      await fireEvent.press(result.getByText('Log Out'));
      await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
    });

    it('tries biometrics once automatically and falls back to the form on failure', async () => {
      authState.biometricUnlockAvailable = true;
      mockUnlockWithBiometrics.mockResolvedValue({ error: 'cancelled' });
      const result = await render(<UnlockGate><Text>SECRET_APP</Text></UnlockGate>);

      await waitFor(() => expect(result.getByText('Unlock application')).toBeTruthy());
      expect(mockUnlockWithBiometrics).toHaveBeenCalledTimes(1);
      // The automatic failure is not surfaced as a form error.
      expect(result.queryByText('cancelled')).toBeNull();
    });

    it('shows a biometric retry error on a manual retry', async () => {
      authState.biometricUnlockAvailable = true;
      mockUnlockWithBiometrics.mockResolvedValueOnce({ error: 'cancelled' });
      const result = await render(<UnlockGate><Text>SECRET_APP</Text></UnlockGate>);
      await waitFor(() => expect(result.getByText('Unlock application')).toBeTruthy());

      mockUnlockWithBiometrics.mockResolvedValueOnce({ error: 'Biometrics failed' });
      await fireEvent.press(result.getByText('Try biometric unlock again'));
      await waitFor(() => expect(result.getByText('Biometrics failed')).toBeTruthy());
      expect(mockUnlockWithBiometrics).toHaveBeenCalledTimes(2);
    });
  });
});
