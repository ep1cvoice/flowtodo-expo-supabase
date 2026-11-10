// Characterization tests for useTaskReorder, including reorder under an active filter.
import { renderHook } from '@testing-library/react-native';
import { useTaskReorder } from '@/features/tasks/lib/useTaskReorder';

const mockReorderTasks = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/features/tasks/TasksContext', () => ({
  useTasks: () => ({ reorderTasks: mockReorderTasks }),
}));
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/shared/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const task = (id: number): any => ({ id, title: `T${id}`, sortOrder: id });
const a = task(1), b = task(2), c = task(3), d = task(4);
const ids = (calls: any[][]) => calls[0][0].map((i: any) => i.id);

beforeEach(() => {
  mockReorderTasks.mockReset().mockResolvedValue(undefined);
  mockShowToast.mockReset();
});

function setup(over: Partial<Parameters<typeof useTaskReorder>[0]> = {}) {
  return renderHook(() =>
    useTaskReorder({
      activeTasks: [a, b, c, d],
      filteredTasks: [a, b, c, d],
      canReorder: true,
      hasListConstraints: false,
      ...over,
    })
  );
}

it('persists the full order with sequential sortOrder on moveTask (no filter)', async () => {
  const { result } = await setup();
  result.current.moveTask(1, 1);
  expect(mockReorderTasks).toHaveBeenCalledWith([
    { id: 2, sortOrder: 0 },
    { id: 1, sortOrder: 1 },
    { id: 3, sortOrder: 2 },
    { id: 4, sortOrder: 3 },
  ]);
});

it('keeps non-filtered tasks in their slots when reordering a filtered list', async () => {
  // Visible: a, c, d (b is hidden by a filter). Move c up above a.
  const { result } = await setup({
    filteredTasks: [a, c, d],
    hasListConstraints: true,
  });
  result.current.moveTask(3, -1);
  // Slots 0,2,3 get [c, a, d]; b stays at slot 1.
  expect(ids(mockReorderTasks.mock.calls)).toEqual([3, 2, 1, 4]);
});

it('handleDragEnd persists reordered data under a filter', async () => {
  const { result } = await setup({ filteredTasks: [a, c, d], hasListConstraints: true });
  result.current.handleDragEnd({ data: [d, c, a] });
  expect(ids(mockReorderTasks.mock.calls)).toEqual([4, 2, 3, 1]);
});

it('does nothing when reordering is disabled', async () => {
  const { result } = await setup({ canReorder: false });
  result.current.moveTask(1, 1);
  result.current.handleDragEnd({ data: [b, a, c, d] });
  expect(mockReorderTasks).not.toHaveBeenCalled();
});

it('ignores drag end with the same array reference', async () => {
  const filtered = [a, b, c, d];
  const { result } = await setup({ filteredTasks: filtered });
  result.current.handleDragEnd({ data: filtered });
  expect(mockReorderTasks).not.toHaveBeenCalled();
});

it('ignores moves past the list edges and unknown ids', async () => {
  const { result } = await setup();
  result.current.moveTask(1, -1);
  result.current.moveTask(4, 1);
  result.current.moveTask(99, 1);
  expect(mockReorderTasks).not.toHaveBeenCalled();
});

it('shows an error toast when persisting fails', async () => {
  mockReorderTasks.mockRejectedValue(new Error('boom'));
  const { result } = await setup();
  result.current.moveTask(1, 1);
  await new Promise<void>((r) => setImmediate(r));
  expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
});
