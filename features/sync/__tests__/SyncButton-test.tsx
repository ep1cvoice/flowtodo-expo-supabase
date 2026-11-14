import { fireEvent, render } from '@testing-library/react-native';

const mockStore = {
  localFirst: true,
  requestSync: jest.fn(),
  status: {
    syncing: false,
    pending: 2,
    error: null as string | null,
    lastSyncedAt: null as string | null,
  },
  getSyncStatus: () => mockStore.status,
  subscribeSyncStatus: () => () => {},
};
// A getter, because the (hoisted) import runs before `mockStore` is initialised.
jest.mock('@/features/tasks/lib/store', () => ({
  get taskStore() {
    return mockStore;
  },
}));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = require('@/shared/constants/theme');
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});
jest.mock('lucide-react-native', () => ({
  CloudCheck: () => null,
  CloudOff: () => null,
  RefreshCw: () => null,
  X: () => null,
}));
jest.mock('@/shared/ui/SheetFrame', () => ({
  __esModule: true,
  default: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
    visible ? children : null,
}));
let mockOnline = true;
jest.mock('@/shared/providers/NetworkContext', () => ({
  useNetwork: () => ({ isOnline: mockOnline }),
}));
jest.mock('@/core/auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));

import SyncButton from '@/features/sync/SyncButton';
import { strings } from '@/shared/lib/strings';

const renderButton = () => render(<SyncButton />);

beforeEach(() => {
  mockOnline = true;
  mockStore.localFirst = true;
  mockStore.status = { syncing: false, pending: 2, error: null, lastSyncedAt: null };
  mockStore.requestSync.mockClear();
});

it('renders nothing for the online-only (web) store', async () => {
  mockStore.localFirst = false;
  const { toJSON } = await renderButton();
  expect(toJSON()).toBeNull();
});

it('keeps the details hidden until the button is pressed, then syncs on demand', async () => {
  const { getByRole, queryByText, getByText } = await renderButton();
  expect(queryByText(strings.sync.syncNow)).toBeNull();

  await fireEvent.press(getByRole('button'));
  expect(getByText(strings.sync.pending(2))).toBeTruthy();

  await fireEvent.press(getByText(strings.sync.syncNow));
  expect(mockStore.requestSync).toHaveBeenCalledWith('u1');
});

it('shows the failure message in the sheet', async () => {
  mockStore.status = { syncing: false, pending: 1, error: 'offline', lastSyncedAt: null };
  const { getByRole, getByText } = await renderButton();
  await fireEvent.press(getByRole('button'));
  expect(getByText(strings.sync.failed(1))).toBeTruthy();
  expect(getByText('offline')).toBeTruthy();
});

it('shows offline as a calm state (no error) and disables manual sync', async () => {
  mockOnline = false;
  mockStore.status = {
    syncing: false,
    pending: 2,
    error: 'Network request failed',
    lastSyncedAt: null,
  };
  const { getByRole, getByText, queryByText } = await renderButton();
  await fireEvent.press(getByRole('button'));

  expect(getByText(strings.sync.offline(2))).toBeTruthy();
  expect(queryByText(strings.sync.failed(2))).toBeNull();
  await fireEvent.press(getByText(strings.sync.syncNow));
  expect(mockStore.requestSync).not.toHaveBeenCalled();
});
