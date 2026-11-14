import { fireEvent, render, screen } from '@testing-library/react-native';
import TasksLoadError from '@/features/tasks/components/TasksLoadError';

jest.mock('lucide-react-native', () => ({ CloudOff: () => null }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/shared/providers/ThemeContext', () => {
  const { lightColors } = jest.requireActual<typeof import('@/shared/constants/theme')>('@/shared/constants/theme');
  return { useTheme: () => ({ colors: lightColors, isDark: false }) };
});

it('shows the failure copy and calls onRetry when pressed', async () => {
  const onRetry = jest.fn().mockResolvedValue(undefined);
  await render(<TasksLoadError onRetry={onRetry} />);

  expect(screen.getByText('Could not load your tasks')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));

  expect(onRetry).toHaveBeenCalledTimes(1);
});
