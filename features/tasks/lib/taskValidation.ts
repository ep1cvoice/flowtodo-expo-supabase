import { strings } from '@/shared/lib/strings';
import type { TaskFormInput } from '@/features/tasks/lib/types';

export type { TaskFormInput };

const TITLE_PATTERN = /^[\p{L}\p{N}\s.,!?'"/:()#\p{Pd}]+$/u;

export function validateTaskTitle(value: string): string {
  if (!value.trim()) return strings.tasks.validation.titleRequired;
  if (value.length > 50) return strings.tasks.validation.titleTooLong;
  if (!TITLE_PATTERN.test(value)) {
    return strings.tasks.validation.titleInvalidChars;
  }
  return '';
}
