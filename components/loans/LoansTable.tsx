'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Edit, Trash2, Eye, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'
import type { Loan, LoanStatus } from '@/lib/loans.types'
import { motion } from 'framer-motion'

interface LoansTableProps {
  loans: Loan[]
  onEdit: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onViewDetails: (loan: Loan) => void
  isPending: boolean
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return dateStr
  }
}

const StatusBadge = ({ status }: { status: LoanStatus }) => {
  const styles = {
    active: 'bg-[var(--primary-050)] text-[var(--primary-700)]',
    paid: 'bg-[var(--success)]/10 text-[var(--success)]',
    past_due: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  }

  const Icons = {
    active: Clock,
    paid: CheckCircle,
    past_due: AlertTriangle,
  }

  const Icon = Icons[status]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        styles[status]
      )}
    >
      <Icon size={12} />
      {status.replace('_', ' ')}
    </span>
  )
}

export default function LoansTable({
  loans,
  onEdit,
  onDelete,
  onViewDetails,
  isPending,
}: LoansTableProps) {
  if (loans.length === 0 && !isPending) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-[var(--bg-muted)] p-8 text-center">
        <p className="text-[var(--text-secondary)]">No loans found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 z-10 bg-[var(--bg-muted)]">
          <tr>
            <Th>Client</Th>
            <Th>Loan Date</Th>
            <Th>Frequency</Th>
            <Th>Amount</Th>
            <Th>Interest %</Th>
            <Th>Status</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {loans.map((loan) => (
            <tr
              key={loan.id}
              onClick={() => onViewDetails(loan)}
              className="group transition-colors hover:bg-[var(--bg-muted)] cursor-pointer"
            >
              <td className="px-4 py-3">
                <div className="font-medium text-[var(--text-primary)]">{loan.clientName}</div>
                {loan.clientPhone && (
                  <div className="text-xs text-[var(--text-secondary)]">{loan.clientPhone}</div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                {formatDate(loan.loanDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">
                {loan.frequency}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                {formatCurrency(loan.amount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                {loan.interestRate}%
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={loan.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions
                  onEdit={() => onEdit(loan)}
                  onDelete={() => onDelete(loan)}
                  onViewDetails={() => onViewDetails(loan)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]',
        align === 'left' ? 'text-left' : 'text-right'
      )}
    >
      {children}
    </th>
  )
}

function RowActions({
  onEdit,
  onDelete,
  onViewDetails,
}: {
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState({ top: 0, right: 0 })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen])

  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="rounded-md p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      >
        <MoreHorizontal size={16} />
      </button>
      {isOpen &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed z-50 w-40 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1 shadow-[var(--shadow-2)]"
            style={{ top: coords.top, right: coords.right }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleAction(onViewDetails)}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Eye size={14} /> View Details
            </button>
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Edit size={14} /> Edit Loan
            </button>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              onClick={() => handleAction(onDelete)}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>,
          document.body
        )}
    </div>
  )
}