import { render } from '@testing-library/react-native';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { useNetwork } from '@/context/NetworkContext';

jest.mock('@/context/NetworkContext', () => ({
  useNetwork: jest.fn(),
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('lucide-react-native', () => ({
  WifiOff: () => null,
}));

const mockUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;

describe('<OfflineBanner />', () => {
  it('renders nothing when online', async () => {
    mockUseNetwork.mockReturnValue({ isOnline: true });
    const { queryByText } = await render(<OfflineBanner />);
    expect(queryByText('No internet connection')).toBeNull();
  });

  it('shows the offline message when offline', async () => {
    mockUseNetwork.mockReturnValue({ isOnline: false });
    const { getByText } = await render(<OfflineBanner />);
    expect(getByText('No internet connection')).toBeTruthy();
  });
});
