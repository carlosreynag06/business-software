// app/(app)/real-estate/RealEstateClient.tsx
'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search as SearchIcon, Plus } from 'lucide-react'
import clsx from 'clsx'

import { useToast } from '@/components/ToastProvider'
import { Button } from '@/components/ui/Button'

import type { RealEstateDeal } from '@/lib/real-estate.types'
import RealEstateTable from '@/components/real-estate/RealEstateTable'
import RealEstateForm from '@/components/real-estate/RealEstateForm'
import RealEstateDetails from '@/components/real-estate/RealEstateDetails'
import {
  createRealEstateDeal,
  updateRealEstateDeal,
  deleteRealEstateDeal,
  markRealEstateSold,
} from './actions'

// Re-usable input styling, aligned with the existing design system
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
] as const

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
] as const

type TypeFilterValue = (typeof TYPE_FILTER_OPTIONS)[number]['value']
type StatusFilterValue = (typeof STATUS_FILTER_OPTIONS)[number]['value']

interface RealEstateClientProps {
  initialDeals: RealEstateDeal[]
}

export default function RealEstateClient({
  initialDeals,
}: RealEstateClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // Core data state
  const [deals, setDeals] = useState<RealEstateDeal[]>(initialDeals)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<TypeFilterValue>('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilterValue>('all')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  // Form & details state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<RealEstateDeal | null>(null)

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<RealEstateDeal | null>(null)

  // Instant, client-side filtering (no "Apply" button)
  const filteredDeals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return deals.filter((deal) => {
      // Search by client name or property address
      if (query) {
        const clientMatch =
          deal.clientName?.toLowerCase().includes(query) ?? false
        const addressMatch =
          deal.propertyAddress?.toLowerCase().includes(query) ?? false

        if (!clientMatch && !addressMatch) return false
      }

      // Type: buyer / seller
      if (filterType !== 'all' && deal.clientType !== filterType) {
        return false
      }

      // Status: active / sold
      if (filterStatus !== 'all' && deal.status !== filterStatus) {
        return false
      }

      // Date range (assuming `deal.date` is YYYY-MM-DD or ISO-like)
      if (filterStartDate && deal.date < filterStartDate) {
        return false
      }
      if (filterEndDate && deal.date > filterEndDate) {
        return false
      }

      return true
    })
  }, [deals, searchQuery, filterType, filterStatus, filterStartDate, filterEndDate])

  // Handlers – open/close modals
  const handleOpenAdd = () => {
    setEditingDeal(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (deal: RealEstateDeal) => {
    setEditingDeal(deal)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingDeal(null)
  }

  const handleOpenDetails = (deal: RealEstateDeal) => {
    setSelectedDeal(deal)
    setIsDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedDeal(null)
  }

  // Create / update
  const handleSaveClient = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'

      const result = isEditing
        ? await updateRealEstateDeal(formData)
        : await createRealEstateDeal(formData)

      if (result.success && result.data) {
        setDeals((prev) => {
          if (isEditing) {
            return prev.map((deal) =>
              deal.id === result.data.id ? result.data : deal,
            )
          }
          return [result.data, ...prev]
        })

        handleCloseForm()

        notify({
          title: `Real estate client ${actionType}`,
          description: 'The record has been saved successfully.',
          variant: 'success',
        })

        router.refresh()
        return
      }

      notify({
        title: 'Error',
        description:
          result.error ?? 'There was a problem saving this real estate record.',
        variant: 'error',
      })
    })
  }

  // Delete
  const handleDeleteClient = (deal: RealEstateDeal) => {
    const confirmed = window.confirm(
      `Delete "${deal.clientName}" from Real Estate? This cannot be undone.`,
    )
    if (!confirmed) return

    startTransition(async () => {
      const result = await deleteRealEstateDeal(deal.id)

      if (result.success) {
        setDeals((prev) => prev.filter((d) => d.id !== deal.id))

        notify({
          title: 'Client deleted',
          description: 'The real estate record has been removed.',
          variant: 'success',
        })

        router.refresh()
        return
      }

      notify({
        title: 'Error',
        description:
          result.error ?? 'There was a problem deleting this real estate record.',
        variant: 'error',
      })
    })
  }

  // Mark as sold
  const handleMarkSold = (deal: RealEstateDeal) => {
    if (deal.status === 'sold') return

    startTransition(async () => {
      const result = await markRealEstateSold(deal.id)

      if (result.success && result.data) {
        setDeals((prev) =>
          prev.map((d) => (d.id === result.data.id ? result.data : d)),
        )

        notify({
          title: 'Marked as sold',
          description: 'The property has been marked as sold.',
          variant: 'success',
        })

        router.refresh()
        return
      }

      notify({
        title: 'Error',
        description:
          result.error ?? 'There was a problem marking this property as sold.',
        variant: 'error',
      })
    })
  }

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & primary action */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Real Estate
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Track buyers, sellers, property values, and commissions.
            </p>
          </div>
          <Button onClick={handleOpenAdd} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Add Client
          </Button>
        </div>

        {/* 2. Filters (instant apply, strict horizontal layout) */}
        <div className="rounded-[var(--radius-xl)] bg-[var(--bg-surface)] px-4 py-3 shadow-[var(--shadow-1)]">
          <div className="flex w-full items-center gap-3 overflow-x-auto">
            {/* Search by client / address */}
            <div className="relative flex-1 min-w-[240px] max-w-lg">
              <SearchIcon
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder="Search by client or property address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>

            {/* Type filter */}
            <div className="shrink-0">
              <select
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as TypeFilterValue)
                }
                className={clsx(inputBaseClass, 'w-32')}
              >
                {TYPE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="shrink-0">
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as StatusFilterValue)
                }
                className={clsx(inputBaseClass, 'w-36')}
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="flex shrink-0 items-center gap-2">
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className={clsx(inputBaseClass, 'w-36')}
              />
              <span className="text-sm text-[var(--text-secondary)]">to</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className={clsx(inputBaseClass, 'w-36')}
              />
            </div>
          </div>
        </div>

        {/* 3. Table view (no Kanban) */}
        <div className="flex-1 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
          <RealEstateTable
            deals={filteredDeals}
            isPending={isPending}
            onEdit={handleOpenEdit}
            onViewDetails={handleOpenDetails}
            onDelete={handleDeleteClient}
            onMarkSold={handleMarkSold}
          />
        </div>
      </div>

      {/* Add / edit form */}
      <RealEstateForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSaveClient}
        initialValues={editingDeal}
        isSubmitting={isPending}
      />

      {/* View details (full contact info) */}
      <RealEstateDetails
        open={isDetailsOpen}
        onClose={handleCloseDetails}
        deal={selectedDeal}
      />
    </>
  )
}
