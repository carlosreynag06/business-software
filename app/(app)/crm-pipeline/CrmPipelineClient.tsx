// app/(app)/crm-pipeline/CrmPipelineClient.tsx
'use client'

import React, {
  useEffect,
  useMemo,
  useState,
  useTransition,
  useCallback,
  useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import type { Lead, MarketingChannel, ServiceType } from '@/lib/types'
import {
  Search as SearchIcon,
  Plus,
  Loader2,
  DollarSign,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Eye,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import LeadFormModal from '@/components/crm/LeadFormModal'
import CrmDetails from '@/components/crm/CrmDetails'
import {
  getLeads,
  createLeadWithContact,
  updateLeadAndContact,
  deleteLead,
} from './actions'

// ---------- Labels & helpers ----------
const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  website: 'Website',
  software: 'Software',
  english_class: 'English Class',
  spanish_class: 'Spanish Class',
  visa: 'Visa Help',
  social_media: 'Social Media',
}

const MARKETING_CHANNEL_LABELS: Record<MarketingChannel, string> = {
  organic: 'Organic',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google_ads: 'Google Ads',
  radio: 'Radio',
  tv: 'TV',
  referral: 'Referral',
  other: 'Other',
}

const SERVICE_OPTIONS: ServiceType[] = [
  'website',
  'software',
  'english_class',
  'spanish_class',
  'visa',
  'social_media',
]

const SOURCE_OPTIONS: MarketingChannel[] = [
  'organic',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google_ads',
  'radio',
  'tv',
  'referral',
  'other',
]

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

const formatCurrencyRD = (value?: number | null) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '—'

// ---------- Props ----------
interface CrmPipelineClientProps {
  initialRows: Lead[]
}

// ---------- Component ----------
export default function CrmPipelineClient({
  initialRows,
}: CrmPipelineClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isClient, setIsClient] = useState(false)

  // Data
  const [rows, setRows] = useState<Lead[]>(initialRows)

  // Filters
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState(q)
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [service, setService] = useState<ServiceType | ''>('')
  const [source, setSource] = useState<MarketingChannel | ''>('')

  // Modals / selection
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)

  // Details Drawer State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Derived
  const totalExpected = useMemo(
    () => rows.reduce((sum, r) => sum + (r.expectedValue ?? 0), 0),
    [rows],
  )

  // Client-side chart data calculation
  const chartData = useMemo(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0) // Start of the day

    const filteredRows = rows.filter(
      (r) => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo,
    )

    const counts = new Map<string, number>()
    for (const row of filteredRows) {
      const sourceLabel =
        MARKETING_CHANNEL_LABELS[row.sourceChannel] || row.sourceChannel
      counts.set(sourceLabel, (counts.get(sourceLabel) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, leads]) => ({ name, leads }))
      .sort((a, b) => b.leads - a.leads)
  }, [rows])

  // Sync rows state if initialRows prop changes
  useEffect(() => {
    setRows(initialRows)
  }, [initialRows])

  // Debounce effect for search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(q), 300)
    return () => clearTimeout(timer)
  }, [q])

  // Refactored filter function
  const applyFilters = useCallback(() => {
    startTransition(async () => {
      const data = await getLeads({
        q: debouncedQ || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        service: service ? [service] : undefined,
        source: source ? [source] : undefined,
      })
      setRows(data)
    })
  }, [debouncedQ, dateFrom, dateTo, service, source, startTransition])

  // Main effect to trigger filtering on any change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  // Set isClient to true only on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Handlers
  const handleOpenAdd = () => {
    setEditingLead(null) // Make sure we're in "add" mode
    setIsFormOpen(true)
  }

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead)
    setIsFormOpen(true)
  }

  const handleOpenDelete = (lead: Lead) => {
    setLeadToDelete(lead)
  }

  const handleOpenDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setIsDetailsOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedLead(null)
  }

  // Create/Update via server actions, then refresh + refetch
  const handleSaveLead = (payload: any) => {
    startTransition(async () => {
      const isEditing = !!editingLead
      if (isEditing) {
        // UPDATE
        const updatedLead = await updateLeadAndContact({
          id: editingLead.id,
          serviceType: payload.serviceType ?? payload.service_type,
          sourceChannel: payload.sourceChannel ?? payload.source_channel,
          expectedValue:
            payload.expectedValue ?? payload.expected_value ?? null,
          notes: payload.notes ?? null,
          contact: payload.contact
            ? {
                id: payload.contact.id,
                fullName: payload.contact.fullName,
                email: payload.contact.email ?? null,
                phone: payload.contact.phone ?? null,
              }
            : undefined,
        })
        // Update local state directly
        setRows((currentRows) =>
          currentRows.map((r) => (r.id === updatedLead.id ? updatedLead : r)),
        )
      } else {
        // CREATE
        const newLead = await createLeadWithContact({
          fullName:
            payload.fullName ?? payload.contact?.fullName ?? 'Nuevo contacto',
          email: payload.email ?? payload.contact?.email ?? undefined,
          phone: payload.phone ?? payload.contact?.phone ?? undefined,
          serviceType: payload.serviceType ?? payload.service_type,
          sourceChannel: payload.sourceChannel ?? payload.source_channel,
          expectedValue:
            payload.expectedValue ?? payload.expected_value ?? null,
          notes: payload.notes ?? null,
        })
        // Update local state directly
        setRows((currentRows) => [newLead, ...currentRows])
      }

      setIsFormOpen(false)
      setEditingLead(null)
    })
  }

  const handleConfirmDelete = () => {
    if (!leadToDelete) return
    const idToDelete = leadToDelete.id // Store ID

    startTransition(async () => {
      // Optimistic UI update
      setRows((currentRows) => currentRows.filter((r) => r.id !== idToDelete))
      setLeadToDelete(null) // Close dialog

      try {
        await deleteLead(idToDelete)
      } catch (error) {
        console.error('Failed to delete lead:', error)
        router.refresh() // Re-fetch on error
      }
    })
  }

  // UI
  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
            Leads
          </h1>
          <p className="mt-1 text-base text-[var(--text-secondary)]">
            A quick-view list of all incoming leads
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--primary-600)]"
        >
          <Plus size={16} />
          <span>Add Lead</span>
        </button>
      </div>

      {/* --- KPI Boxes --- MODIFIED: Removed borders */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-2">
            <Users
              size={16}
              className="flex-shrink-0 text-[var(--text-secondary)]"
            />
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              Total Leads (Filtered)
            </h3>
          </div>
          <p className="mt-2 font-sans text-3xl font-bold text-[var(--text-primary)]">
            {isPending ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              rows.length
            )}
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
          <div className="flex items-center gap-2">
            <DollarSign
              size={16}
              className="flex-shrink-0 text-[var(--text-secondary)]"
            />
            <h3 className="text-sm font-medium text-[var(--text-secondary)]">
              Total Expected (Filtered)
            </h3>
          </div>
          <p className="mt-2 font-sans text-3xl font-bold text-[var(--text-primary)]">
            {isPending ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              formatCurrencyRD(totalExpected)
            )}
          </p>
        </div>
      </div>

      {/* Filter Bar - MODIFIED: Removed border, updated inputs */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-1)] sm:grid-cols-2 lg:grid-cols-5">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <input
            type="text"
            placeholder="Search name, email, or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={clsx(inputBaseClass, "h-10 pl-9")}
          />
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />
        </div>

        {/* Date From */}
        <div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={clsx(inputBaseClass, "h-10")}
            aria-label="Date From"
          />
        </div>

        {/* Date To */}
        <div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={clsx(inputBaseClass, "h-10")}
            aria-label="Date To"
          />
        </div>

        {/* Service (single) */}
        <div>
          <select
            value={service}
            onChange={(e) => setService(e.target.value as ServiceType | '')}
            className={clsx(inputBaseClass, "h-10")}
            aria-label="Service"
          >
            <option value="">All Services</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Source (single) */}
        <div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as MarketingChannel | '')}
            className={clsx(inputBaseClass, "h-10")}
            aria-label="Source"
          >
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {MARKETING_CHANNEL_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* --- Leads per Source Chart (Client-side only) --- MODIFIED: Removed border */}
      <div className="mb-4 h-80 w-full rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
        <h3 className="mb-2 text-sm font-medium text-[var(--text-secondary)]">
          Leads per Source (Last 30 Days)
        </h3>

        {!isClient ? (
          <div className="flex h-[calc(100%-20px)] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : isPending ? (
          <div className="flex h-[calc(100%-20px)] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--text-secondary)]" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-[calc(100%-20px)] w-full items-center justify-center">
            <p className="text-sm text-[var(--text-tertiary)]">
              No lead data found for the last 30 days.
            </p>
          </div>
        ) : (
          <div style={{ height: 'calc(100% - 20px)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--text-tertiary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  wrapperClassName="!rounded-[var(--radius-md)] !border-[var(--border-subtle)]"
                  contentStyle={{
                    backgroundColor: 'var(--surface-elev-1)',
                    color: 'var(--text-primary)',
                    border: 'none',
                  }}
                  cursor={{ fill: 'var(--bg-muted)' }}
                />
                <Bar
                  dataKey="leads"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Table - MODIFIED: Removed border */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)]">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--bg-muted)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Expected Value</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-center text-[var(--text-tertiary)]"
                >
                  {isPending
                    ? 'Loading...'
                    : 'No leads found. Try adjusting your filters.'}
                </td>
              </tr>
            ) : (
              rows.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleOpenDetails(lead)}
                  className="cursor-pointer border-t border-[var(--border-subtle)] hover:bg-[var(--bg-muted)]"
                >
                  <td className="px-4 py-3">
                    {lead.contact?.fullName ?? '—'}
                  </td>
                  <td className="px-4 py-3">{lead.contact?.email ?? '—'}</td>
                  <td className="px-4 py-3">{lead.contact?.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {SERVICE_TYPE_LABELS[lead.serviceType]}
                  </td>
                  <td className="px-4 py-3">
                    {MARKETING_CHANNEL_LABELS[lead.sourceChannel]}
                  </td>
                  <td className="px-4 py-3">{formatDate(lead.createdAt)}</td>
                  <td
                    className="max-w-[200px] truncate px-4 py-3"
                    title={lead.notes ?? ''}
                  >
                    {lead.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrencyRD(lead.expectedValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      lead={lead}
                      onEdit={() => handleOpenEdit(lead)}
                      onDelete={() => handleOpenDelete(lead)}
                      onViewDetails={() => handleOpenDetails(lead)}
                      isPending={isPending}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <LeadFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingLead(null) // Clear editing state on close
        }}
        onSave={handleSaveLead}
        initialData={editingLead}
      />

      <ConfirmDialog
        isOpen={!!leadToDelete}
        onClose={() => setLeadToDelete(null)}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
        title="Delete Lead"
      >
        Are you sure you want to delete the lead for{' '}
        <strong>&quot;{leadToDelete?.contact?.fullName}&quot;</strong>? This
        action cannot be undone.
      </ConfirmDialog>

      <CrmDetails
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        lead={selectedLead}
      />

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
          background: rgba(255, 107, 107, 0.1);
        }
      `}</style>
    </>
  )
}

// --- RowActions Sub-Component ---
interface RowActionsProps {
  lead: Lead
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
  isPending: boolean
}

function RowActions({ onEdit, onDelete, onViewDetails, isPending }: RowActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)
  // --- ADDED FIX ---
  const [opensAbove, setOpensAbove] = useState(false)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Use client rect which is relative to viewport
      const right = window.innerWidth - rect.right - rect.width / 2 + 8

      // --- START FIX ---
      // Check if menu will go off-screen (viewport height)
      // 88px is approx height for 2 items + padding
      const menuHeight = 120 // Increased slightly for the new button
      const spaceBelow = window.innerHeight - rect.bottom

      if (spaceBelow < menuHeight) {
        // Not enough space below, open *above* the button
        setMenuPosition({ top: rect.top - menuHeight - 4, right })
        setOpensAbove(true)
      } else {
        // Enough space below, open *below* the button
        setMenuPosition({ top: rect.bottom + 4, right })
        setOpensAbove(false)
      }
      // --- END FIX ---
      
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
            // --- MODIFIED: Animate based on direction ---
            initial={{ opacity: 0, y: opensAbove ? 10 : -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: opensAbove ? 10 : -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-48 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button onClick={() => handleAction(onViewDetails)} className="menu-item">
              <Eye size={14} /> View Details
            </button>
            <button onClick={() => handleAction(onEdit)} className="menu-item">
              <Edit size={14} /> Edit Lead
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="menu-item-danger"
            >
              <Trash2 size={14} /> Delete Lead
            </button>
          </motion.div>,
          document.body,
        )}
    </div>
  )
}

// --- ConfirmDialog Sub-Component ---
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: React.ReactNode
  isPending: boolean
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  isPending,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
              <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 text-sm text-[var(--text-secondary)]">
              {children}
            </div>
            <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="h-9 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-3 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--border-subtle)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="flex h-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--danger)] px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--danger)]/90 disabled:opacity-50"
              >
                {isPending && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Confirm Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}