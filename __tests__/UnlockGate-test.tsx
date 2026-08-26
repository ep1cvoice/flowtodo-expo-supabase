import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { UnlockGate } from '@/components/ui/UnlockGate';

const mockUnlock = jest.fn();
const mockLogout = jest.fn();

const authState = {
  isAuthenticated: true,
  dek: null as Uint8Array | null,
  loading: false,
  isAuthenticating: false,
  unlock: mockUnlock,
  logout: mockLogout,
};

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => authState,
}));

jest.mock('@/context/ThemeContext', () => {
  const { lightColors } = require('@/constants/theme');
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
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
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
});
