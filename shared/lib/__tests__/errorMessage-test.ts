import { errorMessage } from '@/shared/lib/errorMessage';

it('reads messages from Error instances, strings and plain Supabase-style objects', () => {
  expect(errorMessage(new Error('boom'))).toBe('boom');
  expect(errorMessage('plain')).toBe('plain');
  expect(errorMessage({ message: 'permission denied', details: 'row-level security' })).toBe(
    'permission denied — row-level security'
  );
  expect(errorMessage({ code: 1 })).toBe('{"code":1}');
  expect(errorMessage(undefined)).toBe('undefined');
});
