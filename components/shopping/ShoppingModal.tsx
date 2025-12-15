'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import type { ShoppingItem } from '@/app/(app)/shopping/actions'; // Updated import

// Define the type for the payload passed to onSave
type ShoppingItemPayload = Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>;

// Define props for the modal component
interface ShoppingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: ShoppingItemPayload) => Promise<void>; // Expects the save function
  initialData?: ShoppingItem | null; // Data to pre-fill for editing
  isEditing?: boolean; // Flag to indicate edit mode
  isSaving: boolean; // Prop to indicate save operation is in progress
}

export default function ShoppingModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isEditing = false,
  isSaving,
}: ShoppingModalProps) {
  // State for form fields
  const [description, setDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>(''); // Store cost as string
  const [notes, setNotes] = useState('');

  // Effect to populate form when editing or reset when adding
  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        setDescription(initialData.description || '');
        setEstimatedCost(initialData.estimated_cost != null ? String(initialData.estimated_cost) : '');
        setNotes(initialData.notes || '');
      } else {
        // Reset form for adding
        setDescription('');
        setEstimatedCost('');
        setNotes('');
      }
    }
  }, [isOpen, isEditing, initialData]);

  // Handle cost input change (allow only numbers and one decimal point)
  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
       if (value.split('.').length > 2) return; // Prevent multiple decimal points
       setEstimatedCost(value);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    // Validate Description (required)
    if (!description.trim()) {
      alert('Description is required.'); 
      return;
    }

    // Validate and parse Estimated Cost (optional)
    let numericCost: number | null = null;
    if (estimatedCost.trim() !== '') {
        if (estimatedCost === '.' || isNaN(parseFloat(estimatedCost))) {
            alert('Please enter a valid estimated cost or leave it empty.');
            return;
        }
        numericCost = parseFloat(estimatedCost);
        if (numericCost < 0) {
            alert('Estimated cost cannot be negative.');
            return;
        }
    }

    const payload: ShoppingItemPayload = {
      description: description.trim(),
      category: null, // Category field removed
      estimated_cost: numericCost,
      notes: notes.trim() || null,
    };

    try {
      await onSave(payload);
      // Parent component handles closing on success
    } catch (error) {
      // Error handling/notification is managed by the parent component
      console.error("Save failed in shopping modal:", error);
    }
  };

  // --- Input Classes ---
  const inputClasses =
    'block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]';
  
  const textAreaClasses =
    'block w-full rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]';

  const modalTitle = isEditing ? 'Edit Shopping Item' : 'Add Shopping Item';
  const saveButtonText = isEditing ? 'Save Changes' : 'Add Item';

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
            aria-labelledby="shopping-modal-title"
          >
            {/* Header */}
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <h2 id="shopping-modal-title" className="text-[var(--fs-h3)] font-semibold text-[var(--text-primary)]">
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
                <label htmlFor="shopping-item-description" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Description
                </label>
                <input
                  id="shopping-item-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className={inputClasses}
                  placeholder="e.g., Refrigerator"
                  disabled={isSaving}
                />
              </div>

              {/* Estimated Cost (Optional) */}
              <div>
                <label htmlFor="shopping-item-cost" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Estimated Cost (RD$)
                </label>
                <input
                  id="shopping-item-cost"
                  type="text"
                  inputMode="decimal"
                  pattern="^\d*(\.\d{0,2})?$"
                  value={estimatedCost}
                  onChange={handleCostChange}
                  className={inputClasses}
                  placeholder="(Optional) 0.00"
                  disabled={isSaving}
                />
              </div>

              {/* Notes (Optional) */}
              <div>
                <label htmlFor="shopping-item-notes" className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  Notes
                </label>
                <textarea
                  id="shopping-item-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={textAreaClasses}
                  placeholder="(Optional) Add details like model, store..."
                  disabled={isSaving}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-secondary)] shadow-sm hover:bg-[var(--bg-muted)] disabled:opacity-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)] disabled:opacity-70 transition-colors"
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