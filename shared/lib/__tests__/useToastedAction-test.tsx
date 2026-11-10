import { renderHook } from '@testing-library/react-native';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { toastForError } from '@/shared/lib/networkError';

const mockShowToast = jest.fn();
jest.mock('@/shared/providers/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

beforeEach(() => jest.clearAllMocks());

describe('useToastedAction', () => {
  it('returns the action value and shows no toast on success', async () => {
    const { result } = await renderHook(() => useToastedAction());
    await expect(result.current(async () => 42, 'fallback')).resolves.toEqual({
      ok: true,
      value: 42,
    });
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('shows the fallback as an error toast and resolves ok:false with the error on failure', async () => {
    const { result } = await renderHook(() => useToastedAction());
    const err = new Error('boom');
    await expect(
      result.current(async () => {
        throw err;
      }, 'fallback'),
    ).resolves.toEqual({ ok: false, error: err });
    expect(mockShowToast).toHaveBeenCalledWith(toastForError(err, 'fallback'), 'error');
    expect(toastForError(err, 'fallback')).toBe('fallback');
  });

  it('uses the network message for network errors', async () => {
    const { result } = await renderHook(() => useToastedAction());
    const err = new TypeError('Network request failed');
    await result.current(async () => {
      throw err;
    }, 'fallback');
    expect(mockShowToast).toHaveBeenCalledWith(toastForError(err, 'fallback'), 'error');
    expect(toastForError(err, 'fallback')).not.toBe('fallback');
  });
});
