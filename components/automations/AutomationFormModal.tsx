// components/automations/AutomationFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { Automation } from '@/app/(app)/automations/actions'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

// Mock triggers based on the data in actions.ts
const MOCK_TRIGGERS = [
  "On 'Lead' stage entry",
  'Daily at 9:00 AM',
  "On 'Project' status change",
  "On 'Class Session' completion",
  'Weekly on Monday',
]

// Re-usable input class from design system
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface AutomationFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: Automation | null
  isSaving: boolean
}

export default function AutomationFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: AutomationFormModalProps) {
  const isEditing = !!initialData

  const [formState, setFormState] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || '',
    description: initialData?.description || '',
    trigger: initialData?.trigger || '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormState({
        id: initialData?.id || undefined,
        name: initialData?.name || '',
        description: initialData?.description || '',
        trigger: initialData?.trigger || MOCK_TRIGGERS[0], // Default to first trigger
      })
    }
  }, [isOpen, initialData])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Pass the form state up. The `isActive` flag is handled by actions/client
    onSave({
      ...formState,
      isActive: initialData?.isActive || false, // Default new automations to inactive
    })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Automation' : 'New Automation'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                <FormRow label="Automation Name">
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    className={inputBaseClass}
                    placeholder="e.g., Send Welcome Email"
                    required
                    disabled={isSaving}
                  />
                </FormRow>

                <FormRow label="Trigger">
                  <select
                    name="trigger"
                    value={formState.trigger}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                    disabled={isSaving}
                  >
                    {MOCK_TRIGGERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FormRow>

                <FormRow label="Description (What it does)">
                  <textarea
                    name="description"
                    value={formState.description}
                    onChange={handleChange}
                    rows={3}
                    className={clsx(inputBaseClass, 'h-auto py-2')}
                    placeholder="e.g., When a new lead is created, send the 'Welcome' email template."
                    required
                    disabled={isSaving}
                  />
                </FormRow>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Create Automation'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/*
|--------------------------------------------------------------------------
| Re-usable FormRow
|--------------------------------------------------------------------------
*/
function FormRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {children}
    </div>
  )
}