// components/crypto/CryptoModals.tsx
'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog' // Using the shared component
import AddTransaction from '@/components/crypto/AddTransaction' // The form component
import { CryptoTransaction } from '@/lib/crypto.types' // This type is now USD-based

/*
|--------------------------------------------------------------------------
| Transaction Form Modal
|--------------------------------------------------------------------------
| This is the modal "shell" that wraps the actual form.
*/

interface CryptoTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CryptoTransaction) => void
  initialData: CryptoTransaction | null
  isSaving: boolean
}

export function CryptoTransactionModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: CryptoTransactionModalProps) {
  const isEditing = !!initialData

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={!isSaving ? onClose : undefined}
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
              <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                {isEditing ? 'Edit Transaction' : 'New Transaction'}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSaving}
                aria-label="Close modal"
              >
                <X size={20} />
              </Button>
            </div>

            {/* The AddTransaction component contains its own <form>, 
              scrollable body, and footer with buttons.
            */}
            <AddTransaction
              initialData={initialData}
              onSave={onSave}
              onCancel={onClose}
              isSaving={isSaving}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/*
|--------------------------------------------------------------------------
| Delete Confirmation Modal
|--------------------------------------------------------------------------
| This wraps the shared ConfirmDialog with specific text.
*/

// *** FIXED: Helper to format currency in USD ***
const formatCurrencyUSD = (value: number | undefined | null) => {
  if (value === undefined || value === null) value = 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

interface CryptoDeleteConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  transaction: CryptoTransaction | null
}

export function CryptoDeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  transaction,
}: CryptoDeleteConfirmProps) {
  // Don't render if no transaction is selected
  if (!transaction) return null

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Transaction"
      isPending={isPending}
    >
      Are you sure you want to delete this transaction?
      <br />
      <strong className="font-medium text-[var(--text-primary)]">
        {/* *** FIXED: Use totalUsd *** */}
        {transaction.type} of {formatCurrencyUSD(transaction.totalUsd)}
      </strong>
      <br />
      This action cannot be undone.
    </ConfirmDialog>
  )
}