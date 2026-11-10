import { useEffect, useRef, useState } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { useTasks } from '@/features/tasks/TasksContext';
import { useToastedAction } from '@/shared/lib/useToastedAction';
import { logger } from '@/shared/lib/logger';
import { strings } from '@/shared/lib/strings';
import type { Task } from '@/types';

// Owns the description draft of the task detail sheet and saves it when the field blurs,
// the sheet closes, or the user taps elsewhere in the sheet.
export function useDescriptionAutosave(task: Task) {
  const { updateTask } = useTasks();
  const runToasted = useToastedAction();
  const [draft, setDraft] = useState(task.description ?? '');
  const inputRef = useRef<TextInput>(null);
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);
  const savingRef = useRef(false);
  // Set when a tap should dismiss the keyboard without saving (e.g. the delete button).
  const skipSaveRef = useRef(false);
  const lastSavedRef = useRef((task.description ?? '').trim());
  draftRef.current = draft;

  // Follow external description changes unless the user is typing.
  useEffect(() => {
    if (focusedRef.current) return;
    const next = task.description ?? '';
    setDraft(next);
    lastSavedRef.current = next.trim();
  }, [task.id, task.description]);

  const saveDescription = async () => {
    const next = draftRef.current.trim();
    if (next === lastSavedRef.current || savingRef.current) return;

    savingRef.current = true;
    try {
      const result = await runToasted(
        () =>
          updateTask(task.id, {
            title: task.title,
            description: next,
            categoryId: task.categoryId,
            tagIds: (task.tags ?? []).map((tag) => tag.id),
          }),
        strings.tasks.saveDescriptionFailed,
      );
      if (result.ok) {
        lastSavedRef.current = next;
        if (!focusedRef.current) setDraft(next);
      } else {
        logger.warn(strings.tasks.descriptionSaveLog, result.error);
        if (!focusedRef.current) setDraft(task.description ?? '');
      }
    } finally {
      savingRef.current = false;
    }
  };

  const dismissInput = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
  };

  // Deferred so the blur does not race with the press that triggered it.
  const dismissInputSoon = () => {
    setTimeout(() => {
      dismissInput();
      skipSaveRef.current = false;
    }, 0);
  };

  const commitFromOutside = () => {
    dismissInputSoon();
    if (skipSaveRef.current) return;
    void saveDescription();
  };

  const armSkipSave = () => {
    skipSaveRef.current = true;
    dismissInputSoon();
  };

  const handleFocus = () => {
    focusedRef.current = true;
  };

  const handleBlur = () => {
    focusedRef.current = false;
    if (skipSaveRef.current) return;
    void saveDescription();
  };

  return {
    inputRef,
    draft,
    setDraft,
    saveDescription,
    commitFromOutside,
    armSkipSave,
    handleFocus,
    handleBlur,
  };
}
