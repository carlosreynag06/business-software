// components/classes/StudentFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  ClassStudent,
  ClassLanguage,
  ClassLevel,
  ClassStudentStatus,
} from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
// Based on Schema
const ALL_LEVELS: ClassLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'A1/A2',
  'B1',
  'B2',
  'C1',
  'C2',
]
const ALL_LANGUAGES: ClassLanguage[] = ['english', 'spanish']
const ALL_STATUSES: ClassStudentStatus[] = ['active', 'paused', 'inactive']

// Re-usable input class from design system
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// MODIFIED: This state includes all fields for Contact and Student
type StudentFormState = {
  id: string | undefined
  // Contact fields
  fullName: string
  email: string
  phone: string
  whatsapp: string
  // Student fields
  language: ClassLanguage
  level: ClassLevel
  status: ClassStudentStatus
  goals: string
}

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
export default function StudentFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: StudentFormState) => void // MODIFIED: Passes the full form state
  initialData: ClassStudent | null
  isSaving: boolean
}) {
  const isEditing = !!initialData

  const getInitialState = (): StudentFormState => ({
    id: initialData?.id || undefined,
    // Contact fields
    fullName: initialData?.contact?.fullName || '',
    email: initialData?.contact?.email || '',
    phone: initialData?.contact?.phone || '',
    whatsapp: initialData?.contact?.whatsapp || '',
    // Student fields
    language: initialData?.language || 'english',
    level: initialData?.level || 'B1',
    status: initialData?.status || 'active',
    goals: initialData?.goals || '',
  })

  const [formState, setFormState] = useState<StudentFormState>(getInitialState())

  useEffect(() => {
    if (isOpen) {
      setFormState(getInitialState())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value as any }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Pass the full, flat form state
    onSave(formState)
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
            className="relative z-10 w-full max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Student' : 'Add New Student'}
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
                {/* ADDED: Contact Info Section */}
                <InfoSection title="Contact Info">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Full Name">
                      <input
                        type="text"
                        name="fullName"
                        value={formState.fullName}
                        onChange={handleChange}
                        className={inputBaseClass}
                        required
                        disabled={isSaving || isEditing} // Can't edit name from this form
                      />
                    </FormRow>
                    <FormRow label="Email">
                      <input
                        type="email"
                        name="email"
                        value={formState.email}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving || isEditing}
                      />
                    </FormRow>
                    <FormRow label="Phone (E.164)">
                      <input
                        type="tel"
                        name="phone"
                        placeholder="+18095551234"
                        value={formState.phone}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving || isEditing}
                      />
                    </FormRow>
                    <FormRow label="WhatsApp (E.164)">
                      <input
                        type="tel"
                        name="whatsapp"
                        placeholder="+18095551234"
                        value={formState.whatsapp}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving || isEditing}
                      />
                    </FormRow>
                  </div>
                  {isEditing && (
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Contact info is managed on the main Contacts page.
                    </p>
                  )}
                </InfoSection>

                <InfoSection title="Class Profile">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Language">
                      <select
                        name="language"
                        value={formState.language}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving}
                      >
                        {ALL_LANGUAGES.map((lang) => (
                          <option key={lang} value={lang} className="capitalize">
                            {lang}
                          </option>
                        ))}
                      </select>
                    </FormRow>

                    <FormRow label="Level">
                      <select
                        name="level"
                        value={formState.level}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving}
                      >
                        {ALL_LEVELS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
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

                  <FormRow label="Student Goals">
                    <textarea
                      name="goals"
                      value={formState.goals}
                      onChange={handleChange}
                      rows={3}
                      className={inputBaseClass}
                      placeholder="e.g., Improve business conversation, pass TOEFL..."
                      disabled={isSaving}
                    />
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
                    'Create Student'
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