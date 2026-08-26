import type { TaskFormInput } from '@/lib/tasks/types';

export type { TaskFormInput };

const TITLE_PATTERN = /^[\p{L}\p{N}\s.,!?'"/:()#\p{Pd}]+$/u;

export function validateTaskTitle(value: string): string {
  if (!value.trim()) return 'Title is required';
  if (value.length > 50) return 'Title must be less than 50 characters';
  if (!TITLE_PATTERN.test(value)) {
    return 'Title contains unsupported characters.';
  }
  return '';
}
