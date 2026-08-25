import { fireEvent, render } from '@testing-library/react-native';
import { UnlockGate } from '@/components/ui/UnlockGate';

const mockUnlock = jest.fn();
const mockLogout = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    dek: null,
    loading: false,
    isAuthenticating: false,
    unlock: mockUnlock,
    logout: mockLogout,
  }),
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
  });

  it('shows English unlock copy and does not unlock on empty password', async () => {
    const screen = await render(
      <UnlockGate>
        <></>
      </UnlockGate>
    );

    expect(screen.getByText('Unlock application')).toBeTruthy();
    expect(screen.getByText('Enter your password to decrypt your data')).toBeTruthy();
    expect(screen.getByText('Unlock')).toBeTruthy();
    expect(screen.getByText('Log Out')).toBeTruthy();

    fireEvent.press(screen.getByText('Unlock'));
    expect(mockUnlock).not.toHaveBeenCalled();
  });
});
