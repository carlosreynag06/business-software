'use client'

import React, { useMemo, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Loader2, HandCoins } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/ToastProvider'
import { Button } from '@/components/ui/Button'
import type { Loan, LoanFrequency, LoanStatus } from '@/lib/loans.types'
import { LOAN_FREQUENCIES, LOAN_STATUSES } from '@/lib/loans.types'

// Components
import LoansTable from '@/components/loans/LoansTable'
import LoansForm from '@/components/loans/LoansForm'
import LoanDetails from '@/components/loans/LoanDetails'

import { upsertLoan, deleteLoan } from './actions'

// --- Constants & Styles ---

const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

// --- Main Component ---

interface LoansClientProps {
  initialLoans: Loan[]
}

export default function LoansClient({ initialLoans }: LoansClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- Data State ---
  const [loans, setLoans] = useState<Loan[]>(initialLoans)

  // --- FIX: Sync State with Server Data ---
  // This hook ensures the list updates when the server returns new data after a save.
  useEffect(() => {
    setLoans(initialLoans)
  }, [initialLoans])

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFrequency, setFilterFrequency] = useState<LoanFrequency | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<LoanStatus | 'all'>('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  // --- Modal State ---
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  // --- Filtering Logic ---
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // 1. Search (Client Name)
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (!loan.clientName.toLowerCase().includes(query)) {
          return false
        }
      }

      // 2. Frequency
      if (filterFrequency !== 'all' && loan.frequency !== filterFrequency) {
        return false
      }

      // 3. Status
      if (filterStatus !== 'all' && loan.status !== filterStatus) {
        return false
      }

      // 4. Date Range
      if (filterStartDate && loan.loanDate < filterStartDate) return false
      if (filterEndDate && loan.loanDate > filterEndDate) return false

      return true
    })
  }, [loans, searchQuery, filterFrequency, filterStatus, filterStartDate, filterEndDate])

  // --- Handlers ---

  const handleOpenAdd = () => {
    setEditingLoan(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (loan: Loan) => {
    setEditingLoan(loan)
    setIsFormOpen(true)
  }

  const handleOpenDetails = (loan: Loan) => {
    setSelectedLoan(loan)
    setIsDetailsOpen(true)
  }

  const handleDelete = (loan: Loan) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the loan for ${loan.clientName}? This cannot be undone.`
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteLoan(loan.id)
      if (result.success) {
        // We can rely on the useEffect to update the list after router.refresh()
        notify({
          title: 'Loan Deleted',
          description: `Loan for ${loan.clientName} has been removed.`,
          variant: 'success',
        })
        router.refresh()
      } else {
        notify({
          title: 'Error',
          description: result.error || 'Could not delete loan.',
          variant: 'danger',
        })
      }
    })
  }

  const handleSaveLoan = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'
      
      const result = await upsertLoan(formData)

      if (result.success) {
        notify({
          title: `Loan ${actionType}`,
          description: 'The loan record has been saved successfully.',
          variant: 'success',
        })
        setIsFormOpen(false)
        setEditingLoan(null)
        router.refresh()
      } else {
        notify({
          title: 'Save Failed',
          description: result.error || 'Could not save loan.',
          variant: 'danger',
        })
      }
    })
  }

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-sans text-[28px] font-bold text-[var(--text-primary)]">
              <HandCoins size={28} />
              Loans
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Manage active loans, track payments, and monitor interest
            </p>
          </div>

          <Button onClick={handleOpenAdd} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Add Loan
          </Button>
        </div>

        {/* 2. Filters */}
        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] px-4 py-3 shadow-[var(--shadow-1)]">
          <div className="flex w-full items-center gap-3 overflow-x-auto pb-2 sm:pb-0">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder="Search by client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>

            {/* Frequency */}
            <div className="shrink-0">
              <select
                value={filterFrequency}
                onChange={(e) => setFilterFrequency(e.target.value as LoanFrequency | 'all')}
                className={clsx(inputBaseClass, 'w-40')}
              >
                <option value="all">All Frequencies</option>
                {LOAN_FREQUENCIES.map((f) => (
                  <option key={f} value={f} className="capitalize">
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex shrink-0 items-center gap-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className={clsx(inputBaseClass, 'w-auto')}
                aria-label="Start Date"
              />
              <span className="text-sm text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className={clsx(inputBaseClass, 'w-auto')}
                aria-label="End Date"
              />
            </div>
          </div>
        </div>

        {/* 3. Table View */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)]">
          <LoansTable
            loans={filteredLoans}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onViewDetails={handleOpenDetails}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Modals */}
      <LoansForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveLoan}
        initialData={editingLoan}
        isSaving={isPending}
      />

      <LoanDetails
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        loan={selectedLoan}
      />
    </>
  )
}