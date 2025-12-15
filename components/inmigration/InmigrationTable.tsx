// components/inmigration/InmigrationTable.tsx
'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import type { InmigrationCaseUI } from '@/lib/inmigration.types' // CORRECTED
import type { ComputedCase } from '@/app/(app)/inmigration-services/InmigrationClient' // CORRECTED
import {
  MoreHorizontal,
  Edit,
  Trash2,
  DollarSign,
  CheckCircle,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'

// --- Helpers ---

const formatCurrencyRD = (valueInCents: number | undefined | null) => {
  if (valueInCents === undefined || valueInCents === null) valueInCents = 0
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
    // Dates are YYYY-MM-DD, treat as local
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // Treat the date as UTC to prevent timezone shift
    })
  } catch (e) {
    return 'N/A'
  }
}

// --- Table Component ---

interface InmigrationTableProps { // CORRECTED
  cases: ComputedCase[]
  onRowClick: (id: string) => void
  onEdit: (caseItem: InmigrationCaseUI) => void // CORRECTED
  onDelete: (caseItem: InmigrationCaseUI) => void // CORRECTED
  onRecordPayment: (caseItem: InmigrationCaseUI) => void // CORRECTED
  isPending: boolean
}

export default function InmigrationTable({ // CORRECTED
  cases,
  onRowClick,
  onEdit,
  onDelete,
  onRecordPayment,
  isPending,
}: InmigrationTableProps) { // CORRECTED
  const milestoneMap = useMemo(() => {
    const map = new Map<string, string>()
    cases.forEach((c) => {
      c.milestones.forEach((m) => {
        if (!map.has(m.id)) {
          map.set(m.id, m.label)
        }
      })
    })
    return map
  }, [cases])

  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)] text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--bg-muted)]">
          <tr>
            <Th>Client</Th>
            <Th>Service</Th>
            <Th>Current Milestone</Th>
            <Th>Date</Th>
            <Th>Cost</Th>
            <Th>Amount Paid</Th>
            <Th>Balance</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {cases.length === 0 && (
            <tr>
              <Td colSpan={8} className="py-10 text-center">
                No cases match the current filters.
              </Td>
            </tr>
          )}
          {cases.map((caseItem) => {
            const milestoneLabel =
              milestoneMap.get(caseItem.currentMilestoneId) ||
              caseItem.currentMilestoneId

            return (
              <tr
                key={caseItem.id}
                className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]"
                onClick={() => onRowClick(caseItem.id)}
              >
                <Td className="font-medium">{caseItem.clientName}</Td>
                <Td>{caseItem.service}</Td>
                <Td>
                  <span className="inline-flex rounded-full bg-[var(--primary-050)] px-2 py-0.5 text-xs font-medium text-[var(--primary)]">
                    {milestoneLabel}
                  </span>
                </Td>
                <Td>{formatDate(caseItem.date)}</Td>
                <Td>{formatCurrencyRD(caseItem.costDopCents)}</Td>
                <Td className="text-[var(--success)]">
                  {formatCurrencyRD(caseItem.amountPaidDopCents)}
                </Td>
                <Td
                  className={clsx(
                    'font-medium',
                    caseItem.balanceDopCents > 0
                      ? 'text-[var(--warning)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  {formatCurrencyRD(caseItem.balanceDopCents)}
                </Td>
                <Td className="text-right">
                  <RowActions
                    onEdit={() => onEdit(caseItem)}
                    onDelete={() => onDelete(caseItem)}
                    onRecordPayment={() => onRecordPayment(caseItem)}
                    isPending={isPending}
                  />
                </Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// Table Header Cell
function Th({ children }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={
        'px-4 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]'
      }
    >
      {children}
    </th>
  )
}

// Table Data Cell
function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={clsx(
        'whitespace-nowrap px-4 py-3 align-top',
        className,
      )}
    >
      {children}
    </td>
  )
}

// --- Sub-Component: RowActions (Floating Menu) ---

interface RowActionsProps {
  onEdit: () => void
  onDelete: () => void
  onRecordPayment: () => void
  isPending: boolean
}

function RowActions({
  onEdit,
  onDelete,
  onRecordPayment,
  isPending,
}: RowActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const right = window.innerWidth - rect.right - rect.width / 2
      const top = rect.bottom + window.scrollY + 4
      setMenuPosition({ top, right })
      setIsOpen(true)
    }
  }

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

      {isOpen &&
        menuPosition &&
        createPortal(
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-48 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            {/* IMM:PAYMENT_LABEL=Record Payment (table) */}
            <button
              onClick={() => handleAction(onRecordPayment)}
              className="menu-item"
            >
              <DollarSign size={14} /> Record Payment
            </button>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              onClick={() => handleAction(onEdit)}
              className="menu-item"
            >
              <Edit size={14} /> Edit Case
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="menu-item-danger"
            >
              <Trash2 size={14} /> Delete Case
            </button>
          </motion.div>,
          document.body,
        )}
      {/* Local styles for menu items */}
      <style jsx global>{`
        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          text-align: left;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: var(--radius-sm);
          color: var(--text-primary);
        }
        .menu-item:hover {
          background: var(--bg-muted);
        }
        .menu-item-danger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          text-align: left;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: var(--radius-sm);
          color: var(--danger);
        }
        .menu-item-danger:hover {
          background: rgba(255, 107, 107, 0.1); /* var(--danger-050) */
        }
      `}</style>
    </div>
  )
}
