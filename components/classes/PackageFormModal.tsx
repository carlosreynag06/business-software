// components/classes/PackageFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ClassPackage, PackageStatus } from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
const ALL_STATUSES: PackageStatus[] = ['active', 'completed', 'expired']

// Re-usable input class from design system
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// State for the form, using string for number inputs for better UX
type PackageFormState = {
  id: string | undefined
  title: string
  sessionsIncluded: string
  priceDop: string // User-facing DOP amount (e.g., "18000.00")
  startDate: string
  endDate: string
  status: PackageStatus
}

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface PackageFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void // Will be called with DB-ready data
  initialData: ClassPackage | null
  studentId: string | null // For creating a new package
  isSaving: boolean
}

export default function PackageFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  studentId,
  isSaving,
}: PackageFormModalProps) {
  const isEditing = !!initialData

  const getInitialState = (): PackageFormState => {
    const today = new Date().toISOString().split('T')[0]
    return {
      id: initialData?.id || undefined,
      title: initialData?.title || '',
      sessionsIncluded: initialData?.sessionsIncluded.toString() || '12',
      // Convert cents to string DOP for the input
      priceDop: initialData
        ? (initialData.priceDopCents / 100).toString()
        : '',
      startDate: initialData?.startDate || today,
      endDate: initialData?.endDate || '',
      status: initialData?.status || 'active',
    }
  }

  const [formState, setFormState] = useState<PackageFormState>(getInitialState())

  useEffect(() => {
    if (isOpen) {
      setFormState(getInitialState())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Convert form state to DB-ready data
    const dataToSave = {
      id: formState.id,
      studentId: isEditing ? initialData?.studentId : studentId,
      title: formState.title,
      sessionsIncluded: parseInt(formState.sessionsIncluded) || 0,
      // Convert string DOP to integer cents
      priceDopCents: Math.round(parseFloat(formState.priceDop) * 100) || 0,
      startDate: formState.startDate || null,
      endDate: formState.endDate || null,
      status: formState.status,
    }
    onSave(dataToSave)
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
                  {isEditing ? 'Edit Package' : 'Add New Package'}
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
              <div className="max-h-[70vh] space-y-6 overflow-y-auto p-6">
                <InfoSection title="Package Details">
                  <FormRow label="Title">
                    <input
                      type="text"
                      name="title"
                      value={formState.title}
                      onChange={handleChange}
                      className={inputBaseClass}
                      placeholder="e.g., Paquete de 12 Sesiones"
                      required
                      disabled={isSaving}
                    />
                  </FormRow>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Sessions Included">
                      <input
                        type="number"
                        name="sessionsIncluded"
                        value={formState.sessionsIncluded}
                        onChange={handleChange}
                        className={inputBaseClass}
                        min="0"
                        step="1"
                        required
                        disabled={isSaving}
                      />
                    </FormRow>
                    <FormRow label="Price (RD$)">
                      <input
                        type="number"
                        name="priceDop"
                        value={formState.priceDop}
                        onChange={handleChange}
                        className={inputBaseClass}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                        disabled={isSaving}
                      />
                    </FormRow>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Start Date">
                      <input
                        type="date"
                        name="startDate"
                        value={formState.startDate}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving}
                      />
                    </FormRow>
                    <FormRow label="End Date (Optional)">
                      <input
                        type="date"
                        name="endDate"
                        value={formState.endDate}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving}
                      />
                    </FormRow>
                  </div>

                  <FormRow label="Status">
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    >
                      {ALL_STATUSES.map((status) => (
                        <option
                          key={status}
                          value={status}
                          className="capitalize"
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                </InfoSection>
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
                    'Create Package'
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
| Sub-Components
|--------------------------------------------------------------------------
*/
function InfoSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

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