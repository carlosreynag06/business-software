// components/inmigration/InmigrationForm.tsx
'use client'

import React, { useState, useEffect } from 'react'
import type { InmigrationCaseUI, ServiceTypeUI } from '@/lib/inmigration.types' // CORRECTED
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// The form state. We use strings for number inputs for better UX.
type CaseFormState = {
  clientName: string
  service: ServiceTypeUI
  date: string
  costDop: string // User-facing DOP amount (e.g., "35000.00")
}

interface CaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<InmigrationCaseUI, 'id'>) => void // Passes DB-ready data. CORRECTED
  initialData: InmigrationCaseUI | null // CORRECTED
  isSaving: boolean
  allServiceTypes: ServiceTypeUI[]
}

export default function InmigrationForm({ // CORRECTED
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
  allServiceTypes,
}: CaseFormModalProps) {
  const isEditing = !!initialData
  const [formState, setFormState] = useState<CaseFormState>({
    clientName: '',
    service: 'Visa B1/B2',
    date: '',
    costDop: '',
  })

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0]
      setFormState({
        clientName: initialData?.clientName || '',
        service: initialData?.service || 'Visa B1/B2',
        date: initialData?.date || today,
        // Convert cents to string DOP for the input
        costDop: initialData
          ? (initialData.costDopCents / 100).toString()
          : '',
      })
    }
  }, [isOpen, initialData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value as any }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Convert form state to DB-ready data
    const dataToSave = {
      ...initialData, // Preserve fields we don't edit here (milestones, etc.)
      clientName: formState.clientName,
      service: formState.service,
      date: formState.date,
      // Convert string DOP to integer cents
      costDopCents: Math.round(parseFloat(formState.costDop) * 100) || 0,
    }

    // Cast to Omit<...> to satisfy onSave prop
    const { id, ...saveData } = dataToSave
    onSave(saveData as Omit<InmigrationCaseUI, 'id'>) // CORRECTED
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
                  {isEditing ? 'Edit Case' : 'Add New Case'}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X size={20} />
                </Button>
              </div>
              {/* Form Body */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                <FormRow label="Client Name">
                  <input
                    type="text"
                    name="clientName"
                    value={formState.clientName}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                  />
                </FormRow>

                <FormRow label="Service">
                  <select
                    name="service"
                    value={formState.service}
                    onChange={handleChange}
                    className={inputBaseClass}
                  >
                    {allServiceTypes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </FormRow>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="Date">
                    <input
                      type="date"
                      name="date"
                      value={formState.date}
                      onChange={handleChange}
                      className={inputBaseClass}
                      required
                    />
                  </FormRow>
                  <FormRow label="Total Cost (RD$)">
                    <input
                      type="number"
                      name="costDop"
                      value={formState.costDop}
                      onChange={handleChange}
                      className={inputBaseClass}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </FormRow>
                </div>
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
                    'Create Case'
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

// --- Sub-Component: FormRow (local) ---
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