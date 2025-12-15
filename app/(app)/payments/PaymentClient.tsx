// app/(app)/payments/PaymentClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  Payment,
  Lead,
  ClassStudent, // MODIFIED: Correctly typed
  PaymentMethod,
  Project, // ADDED
} from '@/lib/types'
// ADDED: Import types for Inmigration
import type {
  PaymentUI as InmigrationPayment,
  InmigrationCaseUI,
} from '@/lib/inmigration.types'
import { upsertPayment, deletePayment } from './actions'
// ADDED: Import inmigration-specific actions
import {
  createPayment as createInmigrationPayment,
  unlinkPayment, // Using unlink as the default "delete" for now
} from '../inmigration-services/actions'
import { Plus, Search, Loader2, TrendingUp, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

// Import the new components
import PaymentList from '@/components/payments/PaymentList'
import PaymentFormModal from '@/components/payments/PaymentFormModal'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
// ADDED: A unified type for the merged payment list
type MergedPayment = Payment & {
  paymentType: 'standard' | 'inmigration'
  caseId?: string | null
  contextLabel?: string | null
}

type Period = 'mtd' | '30d' | 'quarter'
type KpiData = {
  totalDopCents: number
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
const formatCurrencyRD = (valueInCents: number | undefined | null) => {
  if (valueInCents === undefined || valueInCents === null) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

const kpiIcons = {
  totalDop: TrendingUp,
  transactions: Receipt,
}

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
// MODIFIED: Props now expect initialStudents and initialProjects
interface PaymentClientProps {
  initialPayments: Payment[]
  initialLeads: Lead[]
  initialStudents: ClassStudent[]
  initialProjects: Project[] // ADDED
  // ADDED: Props for inmigration data
  initialInmigrationPayments: InmigrationPayment[]
  initialInmigrationCases: InmigrationCaseUI[]
}

export default function PaymentClient({
  initialPayments,
  initialLeads,
  initialStudents, // MODIFIED
  initialProjects, // ADDED
  // ADDED: Destructure new props
  initialInmigrationPayments,
  initialInmigrationCases,
}: PaymentClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { notify } = useToast()

  // --- Data State ---
  // MODIFIED: Add fallback '|| []' to all useState hooks to prevent crash
  const [payments, setPayments] = useState(initialPayments || [])
  const [leads, setLeads] = useState(initialLeads || [])
  const [students, setStudents] = useState(initialStudents || [])
  const [projects, setProjects] = useState(initialProjects || [])
  const [inmigrationPayments, setInmigrationPayments] = useState(
    initialInmigrationPayments || [],
  )
  const [inmigrationCases, setInmigrationCases] = useState(
    initialInmigrationCases || [],
  )

  // --- Filter State ---
  const [period, setPeriod] = useState<Period>('mtd')
  const [searchQuery, setSearchQuery] = useState('')

  // --- Modal State ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  // MODIFIED: Use MergedPayment type for editing/deleting
  const [editingPayment, setEditingPayment] = useState<Partial<MergedPayment> | null>(
    null,
  )
  const [paymentToDelete, setPaymentToDelete] = useState<MergedPayment | null>(
    null,
  )

  // Sync server data
  // MODIFIED: Add fallback '|| []' to all useEffect setters
  useEffect(
    () => setPayments(initialPayments || []),
    [initialPayments],
  )
  useEffect(() => setLeads(initialLeads || []), [initialLeads])
  useEffect(
    () => setStudents(initialStudents || []),
    [initialStudents],
  )
  useEffect(
    () => setProjects(initialProjects || []),
    [initialProjects],
  )
  useEffect(
    () => setInmigrationPayments(initialInmigrationPayments || []),
    [initialInmigrationPayments],
  )
  useEffect(
    () => setInmigrationCases(initialInmigrationCases || []),
    [initialInmigrationCases],
  )

  // Check for query params to open modal on load
  useEffect(() => {
    if (searchParams.get('openModal') === 'true') {
      const studentId = searchParams.get('studentId')
      // ADDED: Check for project and case IDs
      const projectId = searchParams.get('projectId')
      const caseId = searchParams.get('caseId')

      setEditingPayment({
        studentId: studentId || undefined,
        projectId: projectId || undefined,
        caseId: caseId || undefined,
        paymentType: caseId ? 'inmigration' : 'standard',
      })
      setIsFormModalOpen(true)
      // Clean up URL
      router.replace('/payments', { scroll: false })
    }
  }, [searchParams, router])

  // --- Memos ---
  // ADDED: Memo to merge both payment lists into a unified shape for the UI
  const allMergedPayments = useMemo((): MergedPayment[] => {
    // 1. Map standard payments
    const standard = payments.map(
      (p) =>
        ({
          ...p,
          paymentType: 'standard',
        }) as MergedPayment,
    )

    // 2. Map inmigration payments to the 'Payment' shape
    // This is the line that was crashing (182)
    const inmigration = inmigrationPayments.map((p) => ([
      p,
      {
        id: p.id,
        amountDopCents: p.amount_dop_cents,
        memo: p.notes,
        dateReceived: p.date,
        method: p.method as PaymentMethod, // Cast to PaymentMethod
        leadId: null,
        studentId: null,
        classPackageId: null,
        projectId: null,
        caseId: p.case_id, // Store the case_id
        contextLabel: p.context_label, // Pass context label through
        paymentType: 'inmigration',
      },
    ][1]))

    // 3. Combine and sort
    return [...standard, ...inmigration].sort(
      (a, b) =>
        new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime(),
    )
  }, [payments, inmigrationPayments])

  const kpiData = useMemo((): KpiData => {
    let totalDopCents = 0
    // MODIFIED: Use allMergedPayments
    allMergedPayments.forEach((p) => {
      totalDopCents += p.amountDopCents
    })
    return {
      totalDopCents: totalDopCents,
    }
  }, [allMergedPayments, period])

  const filteredPayments = useMemo(() => {
    // MODIFIED: Use allMergedPayments
    return allMergedPayments.filter((payment) => {
      const query = searchQuery.toLowerCase()
      if (!query) return true
      const memoMatch = payment.memo?.toLowerCase().includes(query)
      // ADDED: Search by context label
      const contextMatch = payment.contextLabel?.toLowerCase().includes(query)
      return memoMatch || contextMatch
    })
  }, [allMergedPayments, searchQuery])

  // --- Handlers ---
  const handleOpenAddModal = () => {
    setEditingPayment(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (payment: MergedPayment) => {
    setEditingPayment(payment)
    setIsFormModalOpen(true)
  }

  // MODIFIED: "Smart" save handler
  const handleSavePayment = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'

      let result: { success: boolean; data?: any; error?: string }

      // Check if this is an inmigration payment
      if (formData.caseId) {
        // Call inmigration action
        const inmigrationData = {
          date: formData.dateReceived,
          method:
            formData.method.charAt(0).toUpperCase() + formData.method.slice(1),
          amount_dop_cents: formData.amountDopCents,
          notes: formData.memo,
          tags: formData.tags || ['Service fee'],
          case_id: formData.caseId,
        }
        // Inmigration actions return { data, error }
        const { error } = await createInmigrationPayment(inmigrationData)
        result = {
          success: !error,
          error: error,
          data: { ...inmigrationData, id: 'temp' },
        } // Add data for toast
      } else {
        // Call standard payment action
        result = await upsertPayment(formData)
      }

      if (result.success) {
        notify({
          title: `Payment ${actionType}`,
          description: `Payment of ${formatCurrencyRD(
            formData.amountDopCents, // Use formData amount
          )} saved.`,
          variant: 'success',
        })
        setIsFormModalOpen(false)
        setEditingPayment(null)
        router.refresh()
      } else {
        notify({
          title: 'Save Failed',
          description: result.error || 'Could not save the payment.',
          variant: 'danger',
        })
      }
    })
  }

  const handleOpenDeleteConfirm = (payment: MergedPayment) => {
    setPaymentToDelete(payment)
  }

  // MODIFIED: "Smart" delete handler
  const handleConfirmDelete = () => {
    if (!paymentToDelete) return
    const paymentId = paymentToDelete.id
    const paymentType = paymentToDelete.paymentType

    startTransition(async () => {
      let result: { success: boolean; error?: string }

      if (paymentType === 'inmigration') {
        // Use unlinkPayment for inmigration
        const { error } = await unlinkPayment(paymentId)
        result = { success: !error, error: error }
      } else {
        // Use deletePayment for standard payments
        result = await deletePayment(paymentId)
      }

      if (result.success) {
        notify({
          title: 'Payment Action Successful',
          description:
            paymentType === 'inmigration'
              ? 'The inmigration payment has been unlinked.'
              : 'The payment has been deleted.',
          variant: 'success',
        })
        setPaymentToDelete(null)
        router.refresh()
      } else {
        notify({
          title: 'Action Failed',
          description: result.error || 'Could not perform the action.',
          variant: 'danger',
        })
      }
    })
  }

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Payments
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Record and manage all incoming payments
            </p>
          </div>
          <Button onClick={handleOpenAddModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Record Payment
          </Button>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <KpiCard
            title={`Total Received (RD$) - ${period.toUpperCase()}`}
            value={formatCurrencyRD(kpiData.totalDopCents)}
            icon={kpiIcons.totalDop}
            color="success"
          />
          <KpiCard
            title="Total Transactions"
            value={allMergedPayments.length.toString()} // MODIFIED
            icon={kpiIcons.transactions}
            color="secondary"
          />
        </div>

        {/* 3. Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              type="text"
              placeholder="Search by memo or client..." // MODIFIED
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={clsx(inputBaseClass, 'pl-9')}
            />
          </div>
          <PeriodToggle selected={period} onSelect={setPeriod} />
        </div>

        {/* 4. Content Area - MODIFIED: Removed border */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
          {/* MODIFIED: Pass `students`, `projects`, AND `inmigrationCases` props */}
          <PaymentList
            payments={filteredPayments} // MODIFIED: Pass merged list
            leads={leads}
            students={students}
            projects={projects} // ADDED
            inmigrationCases={inmigrationCases} // ADDED
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteConfirm}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <PaymentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSavePayment}
        initialData={editingPayment}
        isSaving={isPending}
        leads={leads}
        students={students} // MODIFIED
        projects={projects} // ADDED
        inmigrationCases={inmigrationCases} // ADDED
      />

      <ConfirmDialog
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
        title={
          // MODIFIED: Dynamic title
          paymentToDelete?.paymentType === 'inmigration'
            ? 'Unlink Payment'
            : 'Delete Payment'
        }
      >
        {/* MODIFIED: Dynamic body text */}
        {paymentToDelete?.paymentType === 'inmigration'
          ? `Are you sure you want to unlink this payment of `
          : `Are you sure you want to delete this payment of `}
        <strong>
          {formatCurrencyRD(paymentToDelete?.amountDopCents)}
        </strong>
        ?
        {paymentToDelete?.paymentType === 'standard' &&
          ' This action cannot be undone.'}
      </ConfirmDialog>
    </>
  )
}

/*
|--------------------------------------------------------------------------
| KPI Card Sub-Component
|--------------------------------------------------------------------------
*/
function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger'
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    success: 'text-[var(--success)]',
    info: 'text-[var(--info)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
  }
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-surface)]',
            colorMap[color],
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </div>
          <div className="font-sans text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Period Toggle Sub-Component
|--------------------------------------------------------------------------
*/
function PeriodToggle({
  selected,
  onSelect,
}: {
  selected: Period
  onSelect: (p: Period) => void
}) {
  const periods: { key: Period; label: string }[] = [
    { key: 'mtd', label: 'MTD' },
    { key: '30d', label: '30 Days' }, // <-- FIXED: Removed 'key:a:'
    { key: 'quarter', label: 'Quarter' },
  ]
  return (
    // MODIFIED: Removed border
    <div className="flex items-center rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-1 shadow-[var(--shadow-1)]">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => onSelect(p.key)}
          className={clsx(
            'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition-colors',
            selected === p.key
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}