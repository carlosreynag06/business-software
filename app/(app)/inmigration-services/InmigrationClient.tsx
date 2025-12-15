// app/(app)/inmigration-services/InmigrationClient.tsx
'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  InmigrationCaseUI, // CORRECTED
  ServiceTypeUI,
  PaymentUI,
} from '@/lib/inmigration.types' // CORRECTED
import { Search, Plus, Loader2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import PaymentFormModal from '@/components/payments/PaymentFormModal'
import InmigrationTable from '@/components/inmigration/InmigrationTable' // CORRECTED
import InmigrationForm from '@/components/inmigration/InmigrationForm' // CORRECTED
import type { Project, Payment } from '@/lib/types'
import clsx from 'clsx'

// ADDED: Real server actions
import {
  createCase,
  updateCase,
  deleteCase,
  createPayment,
} from './actions'

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

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

// Type for the new table row data, including computed values
// MODIFIED: This type is now equivalent to InmigrationCaseUI,
// as the financial data comes from the server.
export interface ComputedCase extends InmigrationCaseUI {}

// --- Main Client Component ---

interface InmigrationClientProps {
  initialCases: InmigrationCaseUI[] // CORRECTED
}

export default function InmigrationClient({
  initialCases,
}: InmigrationClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- Local UI state ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterService, setFilterService] = useState<ServiceTypeUI | 'all'>(
    'all',
  )

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [caseToEdit, setCaseToEdit] = useState<InmigrationCaseUI | null>(null) // CORRECTED
  const [caseToDelete, setCaseToDelete] = useState<InmigrationCaseUI | null>(
    null,
  ) // CORRECTED

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentCaseContext, setPaymentCaseContext] =
    useState<InmigrationCaseUI | null>(null) // CORRECTED

  // --- Memos for Filtering & Options ---
  const serviceTypes = useMemo(() => {
    return [
      'Visa B1/B2',
      'Green Card Petition (I-130)',
      'Citizenship (N-400)',
      'K-1 Fiancé(e)',
      'Student Visa (F-1/M-1)',
      'Consultation',
    ] as ServiceTypeUI[]
  }, []) // Empty dependency array

  // 2. Apply filters to the computed cases
  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      const query = searchQuery.toLowerCase()
      if (query) {
        const searchCorpus = [c.clientName, c.service].join(' ').toLowerCase()
        if (!searchCorpus.includes(query)) return false
      }
      if (filterService !== 'all' && c.service !== filterService) return false
      return true
    })
  }, [initialCases, searchQuery, filterService])

  // 3. Compute new KPIs from the *filtered* list
  const kpiData = useMemo(() => {
    return filteredCases.reduce(
      (acc, c) => {
        acc.totalCost += c.costDopCents
        acc.totalPaid += c.amountPaidDopCents
        acc.totalBalance += c.balanceDopCents
        return acc
      },
      { totalCost: 0, totalPaid: 0, totalBalance: 0 },
    )
  }, [filteredCases])

  // --- Handlers: Modals ---

  const handleOpenAddModal = () => {
    setCaseToEdit(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (caseItem: InmigrationCaseUI) => {
    setCaseToEdit(caseItem)
    setIsFormModalOpen(true)
  }

  // MODIFIED: Wired to server actions
  const handleSaveCase = async (
    formData: {
      clientName: string
      service: ServiceTypeUI
      date: string
      costDopCents: number
    },
  ) => {
    const isEditing = !!caseToEdit

    startTransition(async () => {
      let result
      if (isEditing && caseToEdit) {
        // DB expects snake_case column names
        const patch = {
          client_name: formData.clientName,
          service: formData.service,
          date: formData.date,
          cost_dop_cents: formData.costDopCents,
        }
        result = await updateCase(caseToEdit.id, patch)
      } else {
        result = await createCase(formData)
      }

      if (result?.error) {
        notify({
          title: 'Error saving case',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({
          title: isEditing ? 'Case Updated' : 'Case Created',
          variant: 'success',
        })
        setIsFormModalOpen(false)
        setCaseToEdit(null)
      }
    })
  }

  const handleOpenDeleteConfirm = (caseItem: InmigrationCaseUI) => {
    setCaseToDelete(caseItem)
  }

  // MODIFIED: Wired to server action
  const handleConfirmDelete = async () => {
    if (!caseToDelete) return

    startTransition(async () => {
      const result = await deleteCase(caseToDelete.id)

      if (result?.error) {
        notify({
          title: 'Error deleting case',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({
          title: 'Case Deleted',
          description: `${caseToDelete.clientName}'s case has been removed.`,
          variant: 'success',
        })
        setCaseToDelete(null)
      }
    })
  }

  // --- Handlers: Quick Actions ---

  const handleOpenRecordPaymentModal = (caseItem: InmigrationCaseUI) => {
    setPaymentCaseContext(caseItem)
    setIsPaymentModalOpen(true)
  }

  // MODIFIED: Wired to server action
  const handleSavePayment = async (formData: any) => {
    if (!paymentCaseContext) return
    const caseId = paymentCaseContext.id

    startTransition(async () => {
      const paymentData = {
        date: formData.dateReceived,
        method:
          formData.method === 'cash' ? 'Cash' :
          formData.method === 'card' ? 'Card' :
          formData.method === 'transfer' ? 'Transfer' : 'Cash',
        amount_dop_cents: formData.amountDopCents,
        notes: formData.memo,
        tags: ['Service fee'], // Default tag
        case_id: caseId,
      }

      const result = await createPayment(paymentData)

      if (result?.error) {
        notify({
          title: 'Error saving payment',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({
          title: 'Payment Recorded',
          description: `Payment of ${formatCurrencyRD(
            formData.amountDopCents,
          )} linked to ${paymentCaseContext.clientName}.`,
          variant: 'success',
        })
        setIsPaymentModalOpen(false)
        setPaymentCaseContext(null)
      }
    })
  }

  // --- Handlers: Navigation ---
  const handleRowClick = (caseId: string) => {
    router.push(`/inmigration-services/${caseId}`)
  }

  // --- Prop Transformation for PaymentFormModal ---
  const casesAsProjects = useMemo((): Project[] => {
    return initialCases.map((c) => ({
      id: c.id,
      name: c.service,
      clientName: c.clientName,
      type: 'website',
      budgetDopCents: c.costDopCents,
      amountPaidDopCents: c.amount_paid_dop_cents,
      startDate: null,
      dueDate: null,
    }))
  }, [initialCases])

  const paymentInitialData = useMemo(() => {
    if (!paymentCaseContext) return null
    const computed = initialCases.find((c) => c.id === paymentCaseContext.id)
    const balance = computed ? computed.balance_dop_cents : 0

    return {
      caseId: paymentCaseContext.id, // MODIFIED
      amountDopCents: balance > 0 ? balance : 0,
    }
  }, [paymentCaseContext, initialCases])

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Inmigration Cases
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Manage all visa and citizenship cases
            </p>
          </div>
          <Button onClick={handleOpenAddModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Add Case
          </Button>
        </div>

        {/* 2. New KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <KpiCard
            title="Total Cost"
            value={formatCurrencyRD(kpiData.totalCost)}
            color="secondary"
          />
          <KpiCard
            title="Total Amount Paid"
            value={formatCurrencyRD(kpiData.totalPaid)}
            color="success"
          />
          <KpiCard
            title="Total Balance Due"
            value={formatCurrencyRD(kpiData.totalBalance)}
            color={kpiData.totalBalance > 0 ? 'warning' : 'success'}
          />
        </div>

        {/* 3. Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />
            <input
              type="text"
              placeholder="Search Client or Service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={clsx(inputBaseClass, 'pl-9 w-full')}
            />
          </div>
          {/* Filters */}
          <select
            value={filterService}
            onChange={(e) =>
              setFilterService(e.target.value as ServiceTypeUI | 'all')
            }
            className={clsx(inputBaseClass, 'sm:w-48')}
          >
            <option value="all">All Services</option>
            {serviceTypes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Content Area: Table - MODIFIED: Removed border */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
          <InmigrationTable
            cases={filteredCases}
            onRowClick={handleRowClick}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteConfirm}
            onRecordPayment={handleOpenRecordPaymentModal}
            isPending={isPending}
          />
        </div>

        {/* 5. Pagination (Removed for simplicity based on new table) */}
      </div>

      {/* 6. Modals */}
      <InmigrationForm
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveCase}
        initialData={caseToEdit}
        isSaving={isPending}
        allServiceTypes={serviceTypes}
      />

      <ConfirmDialog
        isOpen={!!caseToDelete}
        onClose={() => setCaseToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Inmigration Case" // CORRECTED
      >
        Are you sure you want to delete the case for{' '}
        <strong>"{caseToDelete?.clientName}"</strong>? This action cannot be
        undone.
      </ConfirmDialog>

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        initialData={paymentInitialData}
        isSaving={isPending}
        leads={[]}
        students={[]}
        projects={[]} 
        inmigrationCases={initialCases} 
      />
    </>
  )
}

// --- Sub-Component: KpiCard ---
function KpiCard({
  title,
  value,
  color,
}: {
  title: string
  value: string
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
          <DollarSign size={20} strokeWidth={2} />
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