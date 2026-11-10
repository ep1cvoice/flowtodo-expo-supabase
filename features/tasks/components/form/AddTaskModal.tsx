import { Plus } from 'lucide-react-native';
import TaskFormModal from '@/features/tasks/components/form/TaskFormModal';
import { toScheduledIso } from '@/features/tasks/lib/calendarDate';
import type { AddTaskInput } from '@/features/tasks/lib/types';

interface AddTaskModalProps {
  visible: boolean;
  onAdd: (task: AddTaskInput) => void | Promise<void>;
  onClose: () => void;
  defaultCategoryId?: number | null;
  defaultTagIds?: number[];
  defaultScheduled?: Date | null;
}

export default function AddTaskModal({
  visible,
  onAdd,
  onClose,
  defaultCategoryId = null,
  defaultTagIds = [],
  defaultScheduled = null,
}: AddTaskModalProps) {
  return (
    <TaskFormModal
      visible={visible}
      heading="Add New Task"
      submitLabel="Add Task"
      submittingLabel="Adding…"
      SubmitIcon={Plus}
      initialValues={{
        title: '',
        description: '',
        categoryId: defaultCategoryId,
        tagIds: defaultTagIds,
      }}
      resetOnClose
      autoFocusTitle
      failLog="Failed to add task:"
      successToast="Task created."
      onSubmit={(values) =>
        onAdd({
          ...values,
          scheduled: defaultScheduled ? toScheduledIso(defaultScheduled) : null,
        })
      }
      onClose={onClose}
    />
  );
}
