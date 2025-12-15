// components/classes/StudentDetailModal.tsx
'use client'

import React, { useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  User,
  Loader2,
  PackagePlus,
  CalendarPlus,
  DollarSign,
  RefreshCw,
} from 'lucide-react'
import type {
  ClassStudent,
  ClassPackage,
  ClassSession,
  PackageStatus,
  AttendanceStatus,
} from '@/lib/types'
import clsx from 'clsx'
import { Button } from '@/components/ui/Button'
// Assume this component exists as per the plan
import AttendanceDropdown from './AttendanceDropdown'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
// MODIFIED: Accepts cents and divides by 100
const formatCurrencyRD = (valueInCents: number | undefined) => {
  if (valueInCents === undefined) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A'
  try {
    // Try parsing as full ISO string first (for timestamptz)
    const date = new Date(dateString)
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      // If not, try parsing as YYYY-MM-DD (which JS Date treats as UTC)
      const parts = dateString.split('-')
      if (parts.length === 3) {
        const utcDate = new Date(
          Date.UTC(
            parseInt(parts[0]),
            parseInt(parts[1]) - 1,
            parseInt(parts[2])
          )
        )
        return utcDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      }
      return 'Invalid Date'
    }
    // If it was a valid full timestamp
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

function StatusBadge({ status }: { status: PackageStatus }) {
  const statusColors: Record<PackageStatus, string> = {
    active: 'bg-[var(--success)]/10 text-[var(--success)]',
    completed: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
    expired: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  }
  return (
    <span
      className={clsx(
        'rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize',
        statusColors[status]
      )}
    >
      {status}
    </span>
  )
}

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
// MODIFIED: Added new props from Client for actions and loading
interface StudentDetailModalProps {
  student: ClassStudent | null
  onClose: () => void
  isLoading: boolean
  onOpenAddPackage: (studentId: string) => void
  onOpenScheduleSession: (studentId: string) => void
  onOpenRecordPayment: (studentId: string, packageId?: string) => void
  onSetAttendance: (sessionId: string, newStatus: AttendanceStatus) => void
  onRenewPackage: (pkg: ClassPackage) => void
}

export default function StudentDetailModal({
  student,
  onClose,
  isLoading,
  onOpenAddPackage,
  onOpenScheduleSession,
  onOpenRecordPayment,
  onSetAttendance,
  onRenewPackage,
}: StudentDetailModalProps) {
  const [isAttending, startAttendanceTransition] = useTransition()

  // Find the active package for action buttons
  const activePackage = student?.packages?.find((p) => p.status === 'active')

  const handleAttendanceChange = (
    sessionId: string,
    newStatus: AttendanceStatus
  ) => {
    startAttendanceTransition(() => {
      onSetAttendance(sessionId, newStatus)
    })
  }

  return (
    <AnimatePresence>
      {student && (
        <div
          className="fixed inset-0 z-50"
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
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-10 ml-auto flex h-full w-full max-w-lg flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-subtle)] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-050)] text-[var(--primary)]">
                  <User size={20} />
                </div>
                <div>
                  <h2
                    id="student-detail-title"
                    className="font-sans text-lg font-semibold text-[var(--text-primary)]"
                  >
                    {student.contact?.fullName || 'Loading...'}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {student.contact?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                <>
                  {/* ADDED: Actions Row */}
                  <InfoSection title="Actions">
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => onOpenAddPackage(student.id)}
                      >
                        <PackagePlus size={16} className="mr-2" />
                        New Package
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onOpenScheduleSession(student.id)}
                      >
                        <CalendarPlus size={16} className="mr-2" />
                        Schedule
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          onOpenRecordPayment(student.id, activePackage?.id)
                        }
                      >
                        <DollarSign size={16} className="mr-2" />
                        Record Payment
                      </Button>
                    </div>
                  </InfoSection>

                  {/* MODIFIED: Student Profile */}
                  <InfoSection title="Student Profile">
                    <InfoRow label="Language" value={student.language} />
                    <InfoRow label="Level" value={student.level} />
                    <InfoRow
                      label="Status"
                      value={student.status}
                      className="capitalize"
                    />
                    <InfoRow label="Goals" value={student.goals} />
                  </InfoSection>

                  <InfoSection title="Contact Info">
                    <InfoRow label="Phone" value={student.contact?.phone} />
                    <InfoRow
                      label="WhatsApp"
                      value={student.contact?.whatsapp}
                    />
                  </InfoSection>

                  {/* MODIFIED: Packages Section */}
                  <InfoSection title="Packages">
                    {student.packages?.length === 0 && (
                      <p className="text-sm text-[var(--text-tertiary)]">
                        No packages found for this student.
                      </p>
                    )}
                    <div className="space-y-3">
                      {student.packages?.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[var(--text-primary)]">
                              {pkg.title}
                            </span>
                            <StatusBadge status={pkg.status} />
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)]">
                            {`${pkg.sessionsConsumed} / ${pkg.sessionsIncluded} sessions used`}
                          </div>
                          <div className="mt-1 text-sm text-[var(--text-secondary)]">
                            {formatCurrencyRD(pkg.priceDopCents)}
                          </div>
                          {/* ADDED: Package Actions */}
                          {pkg.status === 'active' && (
                            <div className="mt-3 flex gap-2 border-t border-[var(--border-subtle)] pt-3">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onRenewPackage(pkg)}
                              >
                                <RefreshCw size={14} className="mr-2" />
                                Renew
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  onOpenRecordPayment(student.id, pkg.id)
                                }
                              >
                                <DollarSign size={14} className="mr-2" />
                                Record Payment
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </InfoSection>

                  {/* MODIFIED: Sessions Section */}
                  <InfoSection title="Recent Sessions">
                    {student.sessions?.length === 0 && (
                      <p className="text-sm text-[var(--text-tertiary)]">
                        No sessions found for this student.
                      </p>
                    )}
                    <div className="space-y-2">
                      {student.sessions?.map((session) => (
                        <div
                          key={session.id}
                          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatDate(session.startTime)}
                            </span>
                            {/* ADDED: Inline Attendance Dropdown */}
                            <AttendanceDropdown
                              value={session.attendance}
                              sessionId={session.id}
                              onChange={handleAttendanceChange}
                              disabled={isAttending}
                            />
                          </div>
                          {session.notes && (
                            <p className="mt-2 border-t border-[var(--border-subtle)] pt-2 text-[var(--text-secondary)]">
                              Notes: {session.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </InfoSection>
                </>
              )}
            </div>
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
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function InfoRow({
  label,
  value,
  className,
}: {
  label: string
  value?: string | null
  className?: string
}) {
  if (!value) return null
  return (
    <div className="text-sm">
      <p className="font-medium text-[var(--text-secondary)]">{label}</p>
      <p className={clsx('text-base text-[var(--text-primary)]', className)}>
        {value}
      </p>
    </div>
  )
}