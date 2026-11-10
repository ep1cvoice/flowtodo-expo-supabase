import { renderHook } from '@testing-library/react-native';
import { useMountOnFirstOpen } from '@/shared/lib/useMountOnFirstOpen';

describe('useMountOnFirstOpen', () => {
  it('stays false until the first open', async () => {
    const { result, rerender } = await renderHook((p: { v: boolean }) => useMountOnFirstOpen(p.v), {
      initialProps: { v: false },
    });
    expect(result.current).toBe(false);
    await rerender({ v: false });
    expect(result.current).toBe(false);
  });

  it('is true on the render that opens and stays true after closing', async () => {
    const { result, rerender } = await renderHook((p: { v: boolean }) => useMountOnFirstOpen(p.v), {
      initialProps: { v: false },
    });
    await rerender({ v: true });
    expect(result.current).toBe(true);
    await rerender({ v: false });
    expect(result.current).toBe(true);
  });

  it('is true when initially visible', async () => {
    const { result } = await renderHook(() => useMountOnFirstOpen(true));
    expect(result.current).toBe(true);
  });
});
