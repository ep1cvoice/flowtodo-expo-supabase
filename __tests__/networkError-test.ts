import {
  NETWORK_TOAST,
  isNetworkError,
  toastForError,
} from '@/lib/networkError';

describe('isNetworkError', () => {
  it('detects common fetch / TypeError failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
    expect(isNetworkError({ status: 0 })).toBe(true);
    expect(isNetworkError('offline')).toBe(true);
  });

  it('ignores normal app / auth errors', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError({ message: 'Invalid login credentials' })).toBe(false);
    expect(isNetworkError({ status: 400, message: 'Bad Request' })).toBe(false);
  });
});

describe('toastForError', () => {
  it('returns network copy for network errors', () => {
    expect(toastForError(new TypeError('Failed to fetch'), 'Could not save.')).toBe(
      NETWORK_TOAST
    );
  });

  it('keeps fallback for other errors', () => {
    expect(toastForError({ message: 'Nope' }, 'Could not save.')).toBe('Could not save.');
  });
});
