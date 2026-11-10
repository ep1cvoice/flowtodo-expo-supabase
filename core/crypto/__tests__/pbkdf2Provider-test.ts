import {
  getPbkdf2Provider,
  registerPbkdf2Provider,
  unregisterPbkdf2Provider,
} from '@/core/crypto/pbkdf2Provider';

const a = jest.fn(async () => 'a');
const b = jest.fn(async () => 'b');

afterEach(() => {
  unregisterPbkdf2Provider(a);
  unregisterPbkdf2Provider(b);
});

it('has no provider by default', () => {
  expect(getPbkdf2Provider()).toBeNull();
});

it('returns the registered provider', () => {
  registerPbkdf2Provider(a);
  expect(getPbkdf2Provider()).toBe(a);
});

it('unregister removes only the matching provider', () => {
  registerPbkdf2Provider(b);
  unregisterPbkdf2Provider(a);
  expect(getPbkdf2Provider()).toBe(b);
  unregisterPbkdf2Provider(b);
  expect(getPbkdf2Provider()).toBeNull();
});
