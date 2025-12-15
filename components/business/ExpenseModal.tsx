'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import type { BusinessSimExpense } from '@/lib/business.types'; // Updated import

// Define the type for the payload passed to onSave (excluding fields handled by DB/server)
type SimExpensePayload = Omit<BusinessSimExpense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>;

// Define props for the modal component
interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: SimExpensePayload) => Promise<void>; // Expects the save function
  initialData?: BusinessSimExpense | null; // Data to pre-fill for editing
  isEditing?: boolean; // Flag to indicate edit mode
  isSaving: boolean; // Prop to indicate save operation is in progress
}

export default function ExpenseModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  isSaving,
}: ExpenseModalProps) {
  // State for form fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>(''); // Store amount as string
  const [expenseType, setExpenseType] = useState<'one_time' | 'recurring'>('one_time'); // Default to one_time
  const [notes, setNotes] = useState('');

  // Effect to populate form when editing or reset when adding
  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setDescription(initialData.description || '');
        setAmount(initialData.amount != null ? String(initialData.amount) : '');
        setExpenseType(initialData.expense_type || 'one_time'); // Set type from initial data
        setNotes(initialData.notes || '');
      } else {
        // Reset form for adding
        setDescription('');
        setAmount('');
        setExpenseType('one_time'); // Reset type to default
        setNotes('');
      }
    }
  }, [isOpen, isEditing, initialData]);

  // Handle amount input change (allow only numbers and one decimal point)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
       if (value.split('.').length > 2) return; // Prevent multiple decimal points
       setAmount(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate amount string before parsing
    if (amount === '' || amount === '.' || isNaN(parseFloat(amount))) {
        alert('Please enter a valid amount.'); // Use alert or toast
        return;
    }
    const numericAmount = parseFloat(amount);

    if (numericAmount < 0) {
      alert('Amount cannot be negative.'); // Use alert or toast
      return;
    }
    if (!description.trim()) {
      alert('Description is required.'); // Use alert or toast
      return;
    }
    if (!expenseType) {
        alert('Expense Type is required.'); // Use alert or toast
        return;
    }

    const payload: SimExpensePayload = {
      description: description.trim(),
      category: null,
      amount: numericAmount,
      expense_type: expenseType, // Include expense type
      notes: notes.trim() || null,
    };

    try {
      await onSave(payload);
      // Parent component handles closing on success
    } catch (error) {
      // Error handling/notification is managed by the parent component
      console.error("Save failed in business sim modal:", error);
    }
  };

  // --- Input Classes ---
  const inputClasses =
    'block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50';
  const textAreaClasses =
    'block w-full rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50';

  const modalTitle = isEditing ? 'Edit Simulated Expense' : 'Add Simulated Expense';
  const saveButtonText = isEditing ? 'Save Changes' : 'Add Expense';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isSaving ? onClose : undefined} // Prevent closing via backdrop during save
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="expense-modal-title"
          >
            {/* Header */}
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <h2 id="expense-modal-title" className="text-[var(--fs-h3)] font-semibold">
                {modalTitle}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                disabled={isSaving}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description (Required) */}
              <div>
                <label htmlFor="sim-expense-description" className="mb-1 block text-sm font-medium">Description</label>
                <input
                  id="sim-expense-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="e.g., Office Rent"
                  disabled={isSaving}
                />
              </div>

              {/* Amount, Type (MODIFIED: Grid changed to 2 cols) */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 {/* Amount (Required) */}
                <div className="sm:col-span-1">
                  <label htmlFor="sim-expense-amount" className="mb-1 block text-sm font-medium">Amount (RD$)</label>
                  <input
                    id="sim-expense-amount"
                    type="text"
                    inputMode="decimal"
                    pattern="^\d*(\.\d{0,2})?$"
                    value={amount}
                    onChange={handleAmountChange}
                    required
                    className={inputClasses}
                    placeholder="0.00"
                    disabled={isSaving}
                  />
                </div>
                {/* Expense Type (Required) */}
                 <div className="sm:col-span-1">
                    <label htmlFor="sim-expense-type" className="mb-1 block text-sm font-medium">Expense Type</label>
                    <select
                        id="sim-expense-type"
                        value={expenseType}
                        onChange={(e) => setExpenseType(e.target.value as 'one_time' | 'recurring')}
                        required
                        className={inputClasses}
                        disabled={isSaving}
                    >
                        <option value="one_time">One-Time</option>
                        <option value="recurring">Recurring</option>
                    </select>
                 </div>
              </div>

              {/* Notes (Optional) */}
              <div>
                <label htmlFor="sim-expense-notes" className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  id="sim-expense-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={textAreaClasses}
                  placeholder="(Optional) Add details..."
                  disabled={isSaving}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)] disabled:opacity-50"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)] disabled:opacity-70"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    saveButtonText
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}