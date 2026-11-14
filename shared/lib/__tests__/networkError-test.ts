import { NETWORK_TOAST, isNetworkError, toastForError } from '@/shared/lib/networkError';

describe('isNetworkError', () => {
  it('detects common fetch / TypeError failures', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
    expect(isNetworkError({ status: 0 })).toBe(true);
    expect(isNetworkError('offline')).toBe(true);
  });

  it('detects TypeErrors with a fetch-failure message across browsers', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError(new TypeError('Load failed'))).toBe(true);
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'))).toBe(
      true
    );
  });

  it('detects timeouts', () => {
    const timeout = new Error('fetchProfile timed out after 8000ms');
    timeout.name = 'TimeoutError';
    expect(isNetworkError(timeout)).toBe(true);
    expect(isNetworkError({ message: 'Network request timed out' })).toBe(true);
    expect(isNetworkError({ message: 'Request timed out' })).toBe(true);
  });

  it('detects a network cause nested in another error', () => {
    expect(isNetworkError(new Error('wrapper', { cause: new TypeError('Failed to fetch') }))).toBe(
      true
    );
  });

  it('does not hide programming errors as network errors', () => {
    expect(
      isNetworkError(new TypeError("Cannot read properties of undefined (reading 'id')"))
    ).toBe(false);
    expect(isNetworkError(new TypeError('undefined is not a function'))).toBe(false);
    expect(isNetworkError(new Error('timeout must be a positive number'))).toBe(false);
    expect(isNetworkError(new Error('Invalid timeout option'))).toBe(false);
  });

  it('ignores normal app / auth errors', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError({ message: 'Invalid login credentials' })).toBe(false);
    expect(isNetworkError({ status: 400, message: 'Bad Request' })).toBe(false);
  });
});

describe('toastForError', () => {
  it('returns network copy for network errors', () => {
    expect(toastForError(new TypeError('Failed to fetch'), 'Could not save.')).toBe(NETWORK_TOAST);
  });

  it('keeps fallback for other errors', () => {
    expect(toastForError({ message: 'Nope' }, 'Could not save.')).toBe('Could not save.');
  });
});
