import { validateTaskTitle } from '@/lib/tasks/taskValidation';

describe('validateTaskTitle', () => {
  it('requires a non-empty title', () => {
    expect(validateTaskTitle('')).toBe('Title is required');
    expect(validateTaskTitle('   ')).toBe('Title is required');
  });

  it('rejects titles longer than 50 characters', () => {
    expect(validateTaskTitle('a'.repeat(51))).toBe('Title must be less than 50 characters');
  });

  it('rejects unsupported characters', () => {
    expect(validateTaskTitle('Hello <script>')).toBe('Title contains unsupported characters.');
  });

  it('allows letters, numbers, and common punctuation', () => {
    expect(validateTaskTitle("Buy milk, it's 2-for-1!")).toBe('');
  });
});
