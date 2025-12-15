'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed useAppState import
// import { useAppState } from '@/app/state-provider';
import { useToast } from '@/components/ToastProvider';
// Import the Server Action
import { addTask } from '@/app/(app)/checklist/actions';

type AddTaskProps = {
  isOpen: boolean;
  onClose: () => void;
  // Add a callback prop to notify parent when a task is added
  onTaskAdded?: () => void;
};

export default function AddTask({ isOpen, onClose, onTaskAdded }: AddTaskProps) {
  // Removed useAppState
  // const { dispatch } = useAppState();
  const { notify } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  // Add state to handle submission loading state
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const inputClasses =
    'block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30';

  // Modify handleSubmit to call the Server Action
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double submission

    const formData = new FormData(e.currentTarget);
    const title = formData.get('task-title') as string;
    // Ensure empty strings become null for Supabase date/text fields
    const dueDate = (formData.get('due-date') as string) || null;
    const costRaw = formData.get('cost') as string;
    // Ensure cost is null if empty/invalid, otherwise parse float
    const cost = costRaw !== '' && !isNaN(parseFloat(costRaw)) ? parseFloat(costRaw) : null;
    const notes = (formData.get('notes') as string) || null;

    if (!title.trim()) {
      notify({
        title: 'Title is required',
        description: 'Please enter a title for the task.',
        variant: 'warning',
      });
      return;
    }

    setIsSubmitting(true); // Set loading state

    try {
      // Prepare payload matching the Server Action input
      const payload = {
        title: title.trim(),
        due_date: dueDate,
        cost: cost,
        notes: notes,
      };

      // Call the Server Action
      const result = await addTask(payload);

      if (result.success) {
        notify({
          title: 'Task Added',
          description: `"${title}" has been added to your checklist.`,
          variant: 'success',
        });
        formRef.current?.reset(); // Reset form on success
        onClose(); // Close modal on success
        // Call the callback to trigger data refresh in the parent page
        if (onTaskAdded) {
          onTaskAdded();
        }
      } else {
        // Show error notification if Server Action fails
        notify({
          title: 'Error Adding Task',
          description: result.error || 'An unexpected error occurred.',
          variant: 'danger',
        });
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      notify({
        title: 'Error',
        description: 'Failed to add task due to an unexpected error.',
        variant: 'danger',
      });
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
          >
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <h2 id="add-task-title" className="text-[var(--fs-h3)] font-semibold">
                Add New Task
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                disabled={isSubmitting} // Disable close button while submitting
              >
                <X size={20} />
              </button>
            </div>

            <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
              {/* Task Title (Required) */}
              <div>
                <label htmlFor="task-title" className="mb-1 block text-sm font-medium">
                  Task Title
                </label>
                <input
                  type="text"
                  id="task-title"
                  name="task-title"
                  required
                  placeholder="e.g., Renew Passports"
                  className={inputClasses}
                  disabled={isSubmitting} // Disable input while submitting
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Due Date (Optional) */}
                <div>
                  <label htmlFor="due-date" className="mb-1 block text-sm font-medium">
                    Due Date
                  </label>
                  <input
                    type="date"
                    id="due-date"
                    name="due-date"
                    className={inputClasses}
                    disabled={isSubmitting}
                  />
                </div>
                {/* Cost (Optional) */}
                <div>
                  <label htmlFor="cost" className="mb-1 block text-sm font-medium">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    id="cost"
                    name="cost"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClasses}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Add any relevant details..."
                  className="block w-full rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30"
                  disabled={isSubmitting}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]"
                  disabled={isSubmitting} // Disable cancel button while submitting
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)] disabled:opacity-60 disabled:cursor-not-allowed" // Add disabled styles
                  disabled={isSubmitting} // Disable submit button while submitting
                >
                  {isSubmitting ? 'Adding...' : 'Add Task'} {/* Change button text while submitting */}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}