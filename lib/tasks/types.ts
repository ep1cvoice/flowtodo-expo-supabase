import type { CategoryIcon } from '@/constants/categoryIcons';

export interface TaskFormInput {
  title: string;
  description: string;
  categoryId: number | null;
  tagIds: number[];
}

export interface AddTaskInput extends TaskFormInput {
  scheduled?: string | null;
}

export type UpdateTaskInput = TaskFormInput;

export interface AddCategoryInput {
  name: string;
  color: string;
  icon: CategoryIcon | string;
}

export interface AddTagInput {
  name: string;
  color: string;
}
