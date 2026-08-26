import { Plus } from 'lucide-react-native';
import type { Category, Tag } from '@/types';
import TaskFormModal from '@/components/tasks/form/TaskFormModal';
import { toScheduledIso } from '@/lib/calendarDate';
import type { TaskFormValues } from '@/lib/taskValidation';

interface AddTaskModalProps {
  visible: boolean;
  onAdd: (task: TaskFormValues & { scheduled?: string | null }) => void | Promise<void>;
  onClose: () => void;
  categories: Category[];
  tags: Tag[];
  defaultCategoryId?: number | null;
  defaultTagIds?: number[];
  defaultScheduled?: Date | null;
}

export default function AddTaskModal({
  visible,
  onAdd,
  onClose,
  categories,
  tags,
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
      categories={categories}
      tags={tags}
      initialValues={{
        title: '',
        description: '',
        categoryId: defaultCategoryId,
        tagIds: defaultTagIds,
      }}
      resetOnClose
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
