'use client';

import * as React from 'react';
import { X, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AddExpenseProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AddExpense({ isOpen, onClose }: AddExpenseProps) {
  // A simple helper for styling form inputs consistently.
  const inputClasses = "block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
            // Per master plan: md width, padding, level-3 shadow
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-3)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-expense-title"
          >
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <h2 id="add-expense-title" className="text-[var(--fs-h3)] font-semibold">
                Add Expense
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            <form className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Date Field (Required) */}
                <div>
                  <label htmlFor="date" className="mb-1 block text-sm font-medium">Date</label>
                  <input type="date" id="date" required className={inputClasses} defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                {/* Amount Field (Required) */}
                <div>
                  <label htmlFor="amount" className="mb-1 block text-sm font-medium">Amount</label>
                  <input type="number" id="amount" required placeholder="0.00" min="0.01" step="0.01" className={inputClasses} />
                </div>
              </div>

              {/* Category (Required Select) */}
              <div>
                <label htmlFor="category" className="mb-1 block text-sm font-medium">Category</label>
                <select id="category" required className={inputClasses}>
                  <option>Groceries</option>
                  <option>Utilities</option>
                  <option>Transport</option>
                  <option>Entertainment</option>
                  <option>Shopping</option>
                </select>
              </div>

              {/* Description (Optional) */}
              <div>
                <label htmlFor="description" className="mb-1 block text-sm font-medium">Description</label>
                <input type="text" id="description" placeholder="e.g., Whole Foods Market" className={inputClasses} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Account (Optional Select) */}
                <div>
                  <label htmlFor="account" className="mb-1 block text-sm font-medium">Account</label>
                  <select id="account" className={inputClasses}>
                    <option>Checking</option>
                    <option>Credit Card</option>
                    <option>Cash</option>
                  </select>
                </div>
                {/* Status (Required, default Pending) */}
                <div>
                  <label htmlFor="status" className="mb-1 block text-sm font-medium">Status</label>
                  <select id="status" required defaultValue="Pending" className={inputClasses}>
                    <option>Pending</option>
                    <option>Paid</option>
                    <option>Unpaid</option>
                  </select>
                </div>
              </div>

              {/* Receipt Upload (Optional) */}
              <div>
                <label className="mb-1 block text-sm font-medium">Receipt (Optional)</label>
                <div className="mt-1 flex justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)] px-6 pt-5 pb-6">
                  <div className="space-y-1 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-[var(--text-tertiary)]" />
                    <div className="flex text-sm text-[var(--text-secondary)]">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-[var(--primary)] hover:text-[var(--primary-600)]">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" accept="image/png, image/jpeg, application/pdf" className="sr-only" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">PNG, JPG, PDF up to 5MB</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]">
                  Cancel
                </button>
                <button type="submit" className="h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)]">
                  Save Expense
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}