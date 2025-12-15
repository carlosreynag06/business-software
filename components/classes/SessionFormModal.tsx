// components/classes/SessionFormModal.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  ClassSession,
  LocationType,
  ClassStudent,
  ClassPackage,
} from '@/lib/types'
import { LOCATION_TYPES } from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

// Re-usable input class from design system
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// Fields from the plan
type SessionFormState = {
  startTime: string // YYYY-MM-DDTHH:MM format
  endTime: string // YYYY-MM-DDTHH:MM format
  // timezone: string, // REMOVED: Mandating DR timezone
  locationType: LocationType
  locationDetail: string
  notes: string
}

// (MODIFIED) Hard-code the single timezone for the business
const APP_TIMEZONE = 'America/Santo_Domingo'

// (MODIFIED) Helper to convert ISO string (UTC) to a 'YYYY-MM-DDTHH:mm' string
// representing the "wall time" in Santo Domingo.
const toDateTimeLocal = (isoString: string | undefined | null): string => {
  if (!isoString) return ''
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) return ''

    // 'sv' locale gives 'YYYY-MM-DD HH:mm:ss'
    const wallTime = date.toLocaleString('sv', { timeZone: APP_TIMEZONE })
    // Return 'YYYY-MM-DDTHH:mm'
    return wallTime.slice(0, 16).replace(' ', 'T')
  } catch (e) {
    console.error('Error in toDateTimeLocal:', e)
    return ''
  }
}

// (BUG FIX) Helper to convert a 'YYYY-MM-DDTHH:mm' string (assumed to be DR wall time)
// back to a UTC ISO string for the database.
const toISOString = (localDateTime: string | undefined | null): string => {
  if (!localDateTime) return new Date().toISOString()

  try {
    // 1. Get parts from the "wall time" string (e.g., "2025-11-08T16:00")
    const [datePart, timePart] = localDateTime.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute] = timePart.split(':').map(Number)

    // 2. America/Santo_Domingo is UTC-4 (no DST).
    // To get UTC, we must ADD 4 hours to the wall time.
    // e.g., 16:00 (4 PM) in DR is 20:00 (8 PM) in UTC.
    const utcDate = Date.UTC(year, month - 1, day, hour + 4, minute)

    // 3. Convert this UTC timestamp to an ISO string.
    return new Date(utcDate).toISOString()
  } catch (e) {
    console.error('Error in toISOString:', e)
    // Fallback to browser-local conversion (this was the source of the bug)
    return new Date(localDateTime).toISOString()
  }
}

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface SessionFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: Partial<ClassSession> | null // From calendar click or event
  studentId?: string | null // Context from parent (e.g., Student Detail)
  groupId?: string | null // Context from parent
  isSaving: boolean
  // (NEW) Passed in from ClassesClient
  students: ClassStudent[]
  packages: ClassPackage[]
}

export default function SessionFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  studentId,
  groupId,
  isSaving,
  students, // (NEW)
  packages, // (NEW)
}: SessionFormModalProps) {
  const isEditing = !!initialData?.id

  // (MODIFIED) Memoize getInitialState
  const getInitialState = useCallback((): SessionFormState => {
    return {
      startTime: toDateTimeLocal(initialData?.startTime),
      endTime: toDateTimeLocal(initialData?.endTime),
      // timezone: initialData?.timezone || APP_TIMEZONE, // REMOVED
      locationType: initialData?.locationType || 'online',
      locationDetail: initialData?.locationDetail || '',
      notes: initialData?.notes || '',
    }
  }, [initialData])

  const [formState, setFormState] = useState<SessionFormState>(getInitialState())

  // (NEW) State for managing student/package selection
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [activePackages, setActivePackages] = useState<ClassPackage[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)

  // (MODIFIED) Effect to set up form state when modal opens
  useEffect(() => {
    if (isOpen) {
      // 1. Reset form fields
      setFormState(getInitialState())
      setValidationError(null)

      // 2. Determine the student ID
      const currentStudentId = studentId || initialData?.studentId || null
      setSelectedStudentId(currentStudentId)

      // 3. Find active packages for this student
      if (currentStudentId) {
        const activePkgs = packages.filter(
          (p) => p.studentId === currentStudentId && p.status === 'active'
        )
        setActivePackages(activePkgs)

        // 4. Auto-select package logic
        if (initialData?.packageId) {
          setSelectedPackageId(initialData.packageId) // Editing, respect initial data
        } else if (activePkgs.length === 1) {
          setSelectedPackageId(activePkgs[0].id) // Auto-select if only one
        } else {
          setSelectedPackageId(null) // Force user to choose if multiple
        }
      } else {
        // No student selected yet (global scheduler)
        setActivePackages([])
        setSelectedPackageId(null)
      }
    }
  }, [isOpen, initialData, studentId, packages, getInitialState])

  // (NEW) Effect to update packages when student changes (in global scheduler)
  useEffect(() => {
    // Only run if the modal is open and not in a student-specific context
    if (isOpen && !studentId) {
      if (selectedStudentId) {
        const activePkgs = packages.filter(
          (p) => p.studentId === selectedStudentId && p.status === 'active'
        )
        setActivePackages(activePkgs)
        // Auto-select package if only one
        if (activePkgs.length === 1) {
          setSelectedPackageId(activePkgs[0].id)
        } else {
          setSelectedPackageId(null)
        }
      } else {
        setActivePackages([])
        setSelectedPackageId(null)
      }
    }
  }, [selectedStudentId, isOpen, studentId, packages])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // (NEW) Validation guard
    if (!selectedStudentId) {
      setValidationError('A student must be selected')
      return
    }

    // Convert form state to DB-ready data
    const dataToSave = {
      id: isEditing ? initialData?.id : undefined,
      // (MODIFIED) Use state for student and package IDs
      studentId: selectedStudentId,
      groupId: initialData?.groupId || groupId || null,
      packageId: selectedPackageId || null,

      // Add form fields from plan
      startTime: toISOString(formState.startTime),
      endTime: toISOString(formState.endTime),
      timezone: APP_TIMEZONE, // (MODIFIED) Hard-code DR timezone
      locationType: formState.locationType,
      locationDetail: formState.locationDetail,
      notes: formState.notes,

      // Pass attendance if editing, otherwise DB defaults to 'scheduled'
      attendance: isEditing ? initialData?.attendance : 'scheduled',
    }
    onSave(dataToSave)
  }

  // (NEW) Show student selector if creating from global scheduler
  const showStudentSelector = !studentId && !isEditing

  // (NEW) Show package selector if student is set and has multiple active packages
  const showPackageSelector = selectedStudentId && activePackages.length > 1

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
                  {isEditing ? 'Edit Session' : 'Schedule New Session'}
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
                <InfoSection title="Session Details">
                  {/* (NEW) Student Selector */}
                  {showStudentSelector && (
                    <FormRow label="Student">
                      <select
                        name="studentId"
                        value={selectedStudentId || ''}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value)
                          if (validationError) setValidationError(null)
                        }}
                        className={clsx(
                          inputBaseClass,
                          validationError &&
                            !selectedStudentId &&
                            'border-[var(--danger)]'
                        )}
                        required
                      >
                        <option value="" disabled>
                          Select a student...
                        </option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.contact.fullName}
                          </option>
                        ))}
                      </select>
                      {validationError && !selectedStudentId && (
                        <p className="mt-1 text-sm text-[var(--danger)]">
                          {validationError}
                        </p>
                      )}
                    </FormRow>
                  )}

                  {/* (NEW) Package Selector */}
                  {showPackageSelector && (
                    <FormRow label="Package (Optional)">
                      <select
                        name="packageId"
                        value={selectedPackageId || ''}
                        onChange={(e) =>
                          setSelectedPackageId(e.target.value || null)
                        }
                        className={inputBaseClass}
                      >
                        <option value="">-- None --</option>
                        {activePackages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </FormRow>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Start Time">
                      <input
                        type="datetime-local"
                        name="startTime"
                        value={formState.startTime}
                        onChange={handleChange}
                        className={inputBaseClass}
                        required
                        disabled={isSaving}
                      />
                    </FormRow>
                    <FormRow label="End Time">
                      <input
                        type="datetime-local"
                        name="endTime"
                        value={formState.endTime}
                        onChange={handleChange}
                        className={inputBaseClass}
                        required
                        disabled={isSaving}
                      />
                    </FormRow>
                  </div>

                  {/* (REMOVED) Timezone field */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Location Type">
                      <select
                        name="locationType"
                        value={formState.locationType}
                        onChange={handleChange}
                        className={inputBaseClass}
                        disabled={isSaving}
                      >
                        {LOCATION_TYPES.map((type) => (
                          <option key={type} value={type} className="capitalize">
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormRow>
                    <FormRow label="Location Detail (Optional)">
                      <input
                        type="text"
                        name="locationDetail"
                        value={formState.locationDetail}
                        onChange={handleChange}
                        className={inputBaseClass}
                        placeholder="e.g., Zoom Link, Sala B"
                        disabled={isSaving}
                      />
                    </FormRow>
                  </div>

                  <FormRow label="Notes (Optional)">
                    <textarea
                      name="notes"
                      value={formState.notes}
                      onChange={handleChange}
                      rows={3}
                      className={inputBaseClass}
                      placeholder="e.g., Repaso de subjuntivo..."
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
                    'Create Session'
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