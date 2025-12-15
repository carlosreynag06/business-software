// components/classes/PackageList.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { ClassPackage, PackageStatus, ClassStudent } from '@/lib/types'
import clsx from 'clsx'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  DollarSign,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

// MODIFIED: Accepts cents (integer) and divides by 100
const formatCurrencyRD = (valueInCents: number | undefined) => {
  if (valueInCents === undefined) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents / 100) // Convert cents to DOP
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A'
  try {
    // Dates are YYYY-MM-DD, treat as UTC
    const parts = dateString.split('-').map(Number)
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
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
| List Component
|--------------------------------------------------------------------------
*/

// ADDED: Action handlers from Plan
interface PackageListProps {
  packages: ClassPackage[]
  // onRenew: (pkg: ClassPackage) => void
  // onRecordPayment: (pkg: ClassPackage) => void
  // onEdit: (pkg: ClassPackage) => void
  // onArchive: (pkg: ClassPackage) => void
  // isPending: boolean
}

export default function PackageList({
  packages,
}: // onRenew,
// onRecordPayment,
// onEdit,
// onArchive,
// isPending,
PackageListProps) {
  // REMOVED: students prop and studentNameMap. Data is now embedded in `pkg.student`.

  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Student
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Package Name
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Progress
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Price (RD$)
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Start Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Expiry Date
            </th>
            {/* ADDED: Actions column */}
            <th className="relative px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {packages.length === 0 && (
            <tr>
              <td
                colSpan={8} // MODIFIED: Colspan is now 8
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No packages match the current filters.
              </td>
            </tr>
          )}
          {packages.map((pkg) => (
            <PackageRow
              key={pkg.id}
              pkg={pkg}
              // Pass handlers down
              onRenew={() => console.log('Renew:', pkg.id)} // onRenew(pkg)
              onRecordPayment={() => console.log('Payment:', pkg.id)} // onRecordPayment(pkg)
              onEdit={() => console.log('Edit:', pkg.id)} // onEdit(pkg)
              onArchive={() => console.log('Archive:', pkg.id)} // onArchive(pkg)
              isPending={false} // isPending
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Package Row Sub-Component
|--------------------------------------------------------------------------
*/

// ADDED: Action handlers
interface PackageRowProps {
  pkg: ClassPackage
  onRenew: () => void
  onRecordPayment: () => void
  onEdit: () => void
  onArchive: () => void
  isPending: boolean
}

function PackageRow({
  pkg,
  onRenew,
  onRecordPayment,
  onEdit,
  onArchive,
  isPending,
}: PackageRowProps) {
  const progressPercent =
    pkg.sessionsIncluded > 0
      ? (pkg.sessionsConsumed / pkg.sessionsIncluded) * 100
      : 0

  // MODIFIED: Get student name from embedded object
  const studentName = pkg.student?.contact?.fullName || 'Unknown Student'

  // TODO: Add logic for unpaid badge when data is available
  // const unpaidAmount = pkg.unpaidDopCents || 0
  // const hasBalance = unpaidAmount > 0

  return (
    // Removed hover:bg-muted to allow row actions to control click propagation
    <tr className="transition-colors">
      <td className="whitespace-nowrap px-5 py-4">
        <div className="font-medium text-[var(--text-primary)]">
          {studentName}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {pkg.title} {/* MODIFIED: Was packageName */}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <StatusBadge status={pkg.status} />
        {/* TODO: Add unpaid badge
        {hasBalance && (
          <span className="ml-2 rounded-[var(--radius-pill)] bg-[var(--warning)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--warning)]">
            Balance Due
          </span>
        )}
        */}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        <div className="flex w-32 flex-col">
          <span>{`${pkg.sessionsConsumed} / ${pkg.sessionsIncluded}`}</span>
          <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--bg-muted)]">
            <div
              className="h-1.5 rounded-full bg-[var(--primary)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
        {formatCurrencyRD(pkg.priceDopCents)} {/* MODIFIED: Was priceTotal */}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {formatDate(pkg.startDate)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {formatDate(pkg.endDate)} {/* MODIFIED: Was expiryDate */}
      </td>
      {/* ADDED: Actions cell */}
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onRenew={onRenew}
          onRecordPayment={onRecordPayment}
          onEdit={onEdit}
          onArchive={onArchive}
          isPending={isPending}
        />
      </td>
    </tr>
  )
}

/*
|--------------------------------------------------------------------------
| Floating Menu for Row Actions (NEW)
|--------------------------------------------------------------------------
*/
function RowActions({
  onRenew,
  onRecordPayment,
  onEdit,
  onArchive,
  isPending,
}: {
  onRenew: () => void
  onRecordPayment: () => void
  onEdit: () => void
  onArchive: () => void
  isPending: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  // Get position of the button to align the menu
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4, // 4px below button
        right: window.innerWidth - rect.right - rect.width / 2, // Align right
      })
      setIsOpen(true)
    }
  }

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation() // Prevent row click
      }}
    >
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          isOpen ? setIsOpen(false) : openMenu()
        }}
        disabled={isPending}
        className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* Portal for Menu */}
      {isOpen &&
        menuPosition &&
        createPortal(
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-10 w-48 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              onClick={() => handleAction(onRenew)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <RefreshCw size={14} /> Renew Package
            </button>
            <button
              onClick={() => handleAction(onRecordPayment)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <DollarSign size={14} /> Record Payment
            </button>
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Edit size={14} /> Edit
            </button>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              onClick={() => handleAction(onArchive)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 size={14} /> Archive
            </button>
          </motion.div>,
          document.body
        )}
    </div>
  )
}