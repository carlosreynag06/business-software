// components/classes/AttendanceDropdown.tsx
'use client'

import React from 'react'
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@/lib/types'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

// Map statuses to colors for the dropdown
const statusColors: Record<AttendanceStatus, string> = {
  scheduled:
    'border-[var(--border)] bg-[var(--surface-elev-1)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]',
  present:
    'border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20',
  late: 'border-[var(--warning)]/50 bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20',
  absent:
    'border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20',
  cancelled:
    'border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20',
}

interface AttendanceDropdownProps {
  value: AttendanceStatus
  sessionId: string
  onChange: (sessionId: string, newStatus: AttendanceStatus) => void
  disabled?: boolean
}

/**
 * A dropdown for changing a session's attendance status.
 * Implements logic from Plan.
 */
export default function AttendanceDropdown({
  value,
  sessionId,
  onChange,
  disabled = false,
}: AttendanceDropdownProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(sessionId, e.target.value as AttendanceStatus)
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled}
        onClick={(e) => e.stopPropagation()} // Prevent parent click events
        className={clsx(
          'appearance-none rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium capitalize transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-70',
          statusColors[value]
        )}
        style={{ paddingRight: '1.75rem' }} // Make space for icon
      >
        {ATTENDANCE_STATUSES.map((status) => (
          <option
            key={status}
            value={status}
            className="capitalize text-black" // Use default text color for options
          >
            {status}
          </option>
        ))}
      </select>
      {disabled && (
        <Loader2
          size={12}
          className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin"
        />
      )}
    </div>
  )
}