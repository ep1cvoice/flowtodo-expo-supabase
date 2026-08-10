import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';

const mockSignIn = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    hideToast: jest.fn(),
    toast: null,
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
  useLocalSearchParams: () => ({}),
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

describe('<LoginScreen />', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  it('shows validation errors and does not call signIn on empty submit', async () => {
    const screen = await render(<LoginScreen />);

    fireEvent.press(screen.getByText('Sign in'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
