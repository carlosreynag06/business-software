// components/payments/PaymentList.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Payment, Lead, ClassStudent, Project, ProjectType } from '@/lib/types'
import type { InmigrationCaseUI } from '@/lib/inmigration.types'
import { MoreHorizontal, Edit, Trash2, Briefcase, GraduationCap } from 'lucide-react'
import { motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

/* ============================== Helpers ============================== */

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
    const parts = dateString.split('-').map(Number)
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return 'Invalid Date'
  }
}

const labelType = (t: ProjectType) => (t === 'website' ? 'Website' : 'Software')

/* ============================ List Component ============================ */

interface PaymentListProps {
  payments: (Payment & { caseId?: string | null })[]
  leads: Lead[]
  students: ClassStudent[]
  projects: Project[]
  inmigrationCases: InmigrationCaseUI[]
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  isPending: boolean
}

export default function PaymentList({
  payments = [],
  leads = [],
  students = [],
  projects = [],
  inmigrationCases = [],
  onEdit,
  onDelete,
  isPending,
}: PaymentListProps) {
  const leadMap = useMemo(
    () => new Map(leads.map((l) => [l.id, l.contact?.fullName || ''])),
    [leads]
  )

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s.contact?.fullName || ''])),
    [students]
  )

  const projectMap = useMemo(
    () =>
      new Map(
        projects.map((p) => [
          p.id,
          { name: p.name, type: p.type, clientName: p.clientName || '' },
        ])
      ),
    [projects]
  )

  const inmigrationCaseMap = useMemo(
    () =>
      new Map(
        inmigrationCases.map((c) => [
          c.id,
          { clientName: c.clientName, service: c.service },
        ])
      ),
    [inmigrationCases]
  )

  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Amount (RD$)
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Method
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Linked To
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Memo
            </th>
            <th className="relative px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {payments.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No payments match the current filters.
              </td>
            </tr>
          )}

          {payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              leadName={payment.leadId ? leadMap.get(payment.leadId) : undefined}
              studentName={payment.studentId ? studentMap.get(payment.studentId) : undefined}
              projectInfo={payment.projectId ? projectMap.get(payment.projectId) : undefined}
              caseId={payment.caseId}
              inmigrationCaseInfo={
                payment.caseId ? inmigrationCaseMap.get(payment.caseId) : undefined
              }
              onEdit={onEdit}
              onDelete={onDelete}
              isPending={isPending}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ======================== Payment Row Sub-Component ======================== */

interface PaymentRowProps {
  payment: Payment
  leadName?: string
  studentName?: string
  projectInfo?: { name: string; type: ProjectType; clientName?: string }
  caseId?: string | null
  inmigrationCaseInfo?: { clientName: string; service: string }
  onEdit: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  isPending: boolean
}

function PaymentRow({
  payment,
  leadName,
  studentName,
  projectInfo,
  caseId,
  inmigrationCaseInfo,
  onEdit,
  onDelete,
  isPending,
}: PaymentRowProps) {
  const amount = formatCurrencyRD(payment.amountDopCents)

  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)]">
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {formatDate(payment.dateReceived)}
      </td>

      <td className="whitespace-nowrap px-5 py-4">
        <span className={clsx('font-semibold', 'text-[var(--success)]')}>{amount}</span>
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-sm capitalize text-[var(--text-secondary)]">
        {payment.method}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <LinkBadge
          leadId={payment.leadId}
          studentId={payment.studentId}
          projectId={payment.projectId}
          caseId={caseId}
          leadName={leadName}
          studentName={studentName}
          projectInfo={projectInfo}
          inmigrationCaseInfo={inmigrationCaseInfo}
        />
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {payment.memo || <span className="text-[var(--text-tertiary)]">--</span>}
      </td>

      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onEdit={() => onEdit(payment)}
          onDelete={() => onDelete(payment)}
          isPending={isPending}
        />
      </td>
    </tr>
  )
}

/* ============================== Helper Components ============================== */

function LinkBadge({
  leadId,
  studentId,
  projectId,
  caseId,
  leadName,
  studentName,
  projectInfo,
  inmigrationCaseInfo,
}: {
  leadId?: string | null
  studentId?: string | null
  projectId?: string | null
  caseId?: string | null
  leadName?: string
  studentName?: string
  projectInfo?: { name: string; type: ProjectType; clientName?: string }
  inmigrationCaseInfo?: { clientName: string; service: string }
}) {
  let text = ''
  let Icon = Briefcase
  let colorClass = 'bg-[var(--primary-050)] text-[var(--primary)]'

  if (leadId && leadName) {
    text = `Lead: ${leadName}`
  } else if (studentId && studentName) {
    text = `Student: ${studentName}`
    Icon = GraduationCap
    colorClass = 'bg-[var(--secondary)]/10 text-[var(--secondary)]'
  } else if (projectId && projectInfo) {
    text = `Project: ${projectInfo.clientName || 'Sin Cliente'} • ${labelType(projectInfo.type)}`
    Icon = Briefcase
    colorClass = 'bg-[var(--primary-050)] text-[var(--primary)]'
  } else if (caseId && inmigrationCaseInfo) {
    text = `Inmigration: ${inmigrationCaseInfo.clientName} • ${inmigrationCaseInfo.service}`
    Icon = Briefcase
    colorClass = 'bg-blue-100 text-blue-800'
  } else {
    return <span className="text-[var(--text-tertiary)]">Unlinked</span>
  }

  return (
    <span
      className={clsx(
        'flex w-fit max-w-xs items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium',
        colorClass
      )}
    >
      <Icon size={14} />
      <span className="truncate">{text}</span>
    </span>
  )
}

function RowActions({
  onEdit,
  onDelete,
  isPending,
}: {
  onEdit: () => void
  onDelete: () => void
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

  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right - rect.width / 2,
      })
      setIsOpen(true)
    }
  }

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation()
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
            className="fixed z-10 w-36 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>,
          document.body
        )}
    </div>
  )
}
