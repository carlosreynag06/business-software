// app/(app)/marketing/MarketingClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  MarketingTouch,
  Lead,
  Contact,
  MarketingChannel,
  TouchType,
} from '@/lib/types'
import {
  upsertMarketingTouch,
  deleteMarketingTouch,
  // getMarketingData, // This will be used by the page.tsx
} from './actions'
import {
  Users,
  Search,
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  BarChart3,
  List,
  Mail,
  MessageSquare,
  MousePointerClick,
  QrCode,
  Store,
  Eye,
  Phone,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import MarketingList from '@/components/marketing/MarketingList'
import MarketingFormModal from '@/components/marketing/MarketingFormModal'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

type View = 'table' | 'timeline'

// From My Business Software Desgin.pdf
const CHANNEL_COLORS: Record<MarketingChannel, string> = {
  organic: '#2BB673',
  instagram: '#E1306C',
  facebook: '#1877F2',
  tiktok: '#25F4EE',
  youtube: '#FF0000',
  google_ads: '#4285F4',
  radio: '#F28830',
  tv: '#7B61FF',
  referral: '#00B8D9',
  other: '#7A7572',
}

// From My Business Software.pdf (lib/types.ts)
const ALL_CHANNELS: MarketingChannel[] = [
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

// From My Business Software.pdf (lib/types.ts)
const ALL_TOUCH_TYPES: TouchType[] = [
  'impression',
  'click',
  'form',
  'call',
  'qr',
  'visit',
]

// Friendly labels for UI
const MARKETING_CHANNEL_LABELS: Record<MarketingChannel, string> = {
  organic: 'Organic',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google_ads: 'Google Ads',
  radio: 'Radio/TV', // Grouped
  tv: 'Radio/TV', // Grouped
  referral: 'Referral',
  other: 'Other',
}

const TOUCH_TYPE_LABELS: Record<TouchType, { label: string; icon: React.ElementType }> = {
  impression: { label: 'Impression', icon: Eye },
  click: { label: 'Click', icon: MousePointerClick },
  form: { label: 'Form', icon: Mail },
  call: { label: 'Call', icon: Phone },
  qr: { label: 'QR Scan', icon: QrCode },
  visit: { label: 'Visit', icon: Store },
}

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

// Format as RD$ per the design spec
const formatCurrencyRD = (value: number | undefined) => {
  if (value === undefined) value = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatDate = (isoString?: string | null) => {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'America/Santo_Domingo', // Per spec
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

const formatDateOnly = (isoString?: string | null) => {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Santo_Domingo',
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
interface MarketingClientProps {
  initialTouches: MarketingTouch[]
  initialLeads: Lead[]
  initialContacts: Contact[]
}

export default function MarketingClient({
  initialTouches,
  initialLeads,
  initialContacts,
}: MarketingClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- View State ---
  const [view, setView] = useState<View>('table')

  // --- Data State ---
  const [touches, setTouches] = useState(initialTouches)
  const [leads, setLeads] = useState(initialLeads)
  const [contacts, setContacts] = useState(initialContacts)

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterChannel, setFilterChannel] = useState<'all' | MarketingChannel>('all')
  const [filterTouchType, setFilterTouchType] = useState<'all' | TouchType>('all')

  // --- Modal State ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingTouch, setEditingTouch] = useState<MarketingTouch | null>(null)
  const [touchToDelete, setTouchToDelete] = useState<MarketingTouch | null>(null)

  // Sync server data (for router.refresh())
  useEffect(() => setTouches(initialTouches), [initialTouches])
  useEffect(() => setLeads(initialLeads), [initialLeads])
  useEffect(() => setContacts(initialContacts), [initialContacts])

  // --- Memos for Filtered Data ---
  const contactMap = useMemo(() => {
    return new Map(contacts.map((c) => [c.id, c.fullName || 'Unknown']))
  }, [contacts])

  const filteredTouches = useMemo(() => {
    return touches.filter((touch) => {
      const query = searchQuery.toLowerCase()

      // Filter by Search Query
      if (query) {
        const contactName = touch.contactId ? contactMap.get(touch.contactId)?.toLowerCase() : ''
        const utmSourceMatch = touch.utmSource?.toLowerCase().includes(query)
        const utmCampaignMatch = touch.utmCampaign?.toLowerCase().includes(query)
        const contactMatch = contactName?.includes(query)

        if (!utmSourceMatch && !utmCampaignMatch && !contactMatch) {
          return false
        }
      }

      // Filter by Channel
      if (filterChannel !== 'all' && touch.channel !== filterChannel) {
        return false
      }

      // Filter by Touch Type
      if (filterTouchType !== 'all' && touch.touchType !== filterTouchType) {
        return false
      }

      return true
    })
  }, [touches, searchQuery, filterChannel, filterTouchType, contactMap])

  // --- Handlers ---
  const handleOpenAddModal = () => {
    setEditingTouch(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (touch: MarketingTouch) => {
    setEditingTouch(touch)
    setIsFormModalOpen(true)
  }

  const handleOpenDeleteConfirm = (touch: MarketingTouch) => {
    setTouchToDelete(touch)
  }

  const handleSaveTouch = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'
      
      // MOCK ACTION
      console.log('MOCK: Saving touch...', formData)
      const result = isEditing 
        ? await upsertMarketingTouch(formData) 
        : await upsertMarketingTouch(formData);

      if (result.success) {
        notify({
          title: `Touchpoint ${actionType}`,
          description: `The touchpoint has been saved.`,
          variant: 'success',
        })
        setIsFormModalOpen(false)
        setEditingTouch(null)
        router.refresh()
      } else {
         notify({
          title: 'Save Failed',
          description: result.error || 'Could not save the touchpoint.',
          variant: 'danger',
        })
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!touchToDelete) return
    const touchId = touchToDelete.id

    startTransition(async () => {
      // MOCK ACTION
      console.log('MOCK: Deleting touch...', touchId)
      const result = await deleteMarketingTouch(touchId);

      if (result.success) {
        notify({
          title: 'Touchpoint Deleted',
          description: `The touchpoint has been deleted.`,
          variant: 'success',
        })
        setTouchToDelete(null)
        router.refresh()
      } else {
        notify({
          title: 'Delete Failed',
          description: result.error || 'Could not delete the touchpoint.',
          variant: 'danger',
        })
        setTouchToDelete(null)
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
              Marketing Touches
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Track all marketing impressions, clicks, and form submissions
            </p>
          </div>
          <Button onClick={handleOpenAddModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Add Touch
          </Button>
        </div>

        {/* 3. View Toggles & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* View Toggles */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <TabButton
              label="Table"
              icon={List}
              isActive={view === 'table'}
              onClick={() => setView('table')}
            />
            <TabButton
              label="Timeline"
              icon={BarChart3}
              isActive={view === 'timeline'}
              onClick={() => setView('timeline')}
            />
          </div>

          {/* Filter Bar */}
          <div className="flex w-full min-w-0 flex-1 items-center gap-3">
            <div className="relative w-full flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder="Search by contact, UTM source..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>
            <select
              value={filterChannel}
              onChange={(e) =>
                setFilterChannel(e.target.value as 'all' | MarketingChannel)
              }
              className={clsx(inputBaseClass, 'w-40')}
            >
              <option value="all">All Channels</option>
              {ALL_CHANNELS.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {MARKETING_CHANNEL_LABELS[c] || c}
                </option>
              ))}
            </select>
            <select
              value={filterTouchType}
              onChange={(e) =>
                setFilterTouchType(e.target.value as 'all' | TouchType)
              }
              className={clsx(inputBaseClass, 'w-40')}
            >
              <option value="all">All Types</option>
              {ALL_TOUCH_TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {TOUCH_TYPE_LABELS[t]?.label || t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Content Area - MODIFIED: Removed border */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {view === 'table' && (
                <MarketingList
                  touches={filteredTouches}
                  contactMap={contactMap}
                  onEdit={handleOpenEditModal}
                  onDelete={handleOpenDeleteConfirm}
                  isPending={isPending}
                />
              )}
              {view === 'timeline' && (
                <TimelineView
                  touches={filteredTouches}
                  contactMap={contactMap}
                  onEdit={handleOpenEditModal}
                  onDelete={handleOpenDeleteConfirm}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <MarketingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveTouch}
        initialData={editingTouch}
        isSaving={isPending}
        leads={leads}
        contacts={contacts}
      />

      <ConfirmDialog
        isOpen={!!touchToDelete}
        onClose={() => setTouchToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Touchpoint"
      >
        Are you sure you want to delete this touchpoint? This action cannot be
        undone.
      </ConfirmDialog>
    </>
  )
}

/*
|--------------------------------------------------------------------------
| Sub-Component: TabButton
|--------------------------------------------------------------------------
*/
function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string
  icon: React.ElementType
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex h-10 items-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-medium shadow-[var(--shadow-1)] transition-colors',
        isActive
          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
          : 'border-[var(--border)] bg-[var(--surface-elev-1)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

/*
|--------------------------------------------------------------------------
| View 2: Timeline View
|--------------------------------------------------------------------------
*/
function TimelineView({
  touches,
  contactMap,
  onEdit,
  onDelete,
}: {
  touches: MarketingTouch[]
  contactMap: Map<string, string>
  onEdit: (touch: MarketingTouch) => void
  onDelete: (touch: MarketingTouch) => void
}) {
  const groupedTouches = useMemo(() => {
    const groups: Record<string, MarketingTouch[]> = {}
    const sorted = [...touches].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    
    sorted.forEach((touch) => {
      const dateKey = formatDateOnly(touch.timestamp)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(touch)
    })
    return groups
  }, [touches])

  return (
    <div className="h-full overflow-y-auto px-2">
      <div className="mx-auto max-w-2xl">
        {Object.keys(groupedTouches).length === 0 && (
           <div className="flex h-full min-h-[200px] items-center justify-center p-4 text-center">
             <p className="text-sm text-[var(--text-tertiary)]">
               No touchpoints match the current filters.
             </p>
           </div>
        )}
        {Object.entries(groupedTouches).map(([date, dateTouches]) => (
          <div key={date} className="relative pb-8">
            {/* Date Header */}
            <div className="sticky top-0 z-10 bg-[var(--surface-elev-1)] py-2">
              <h3 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                {date}
              </h3>
            </div>
            
            {/* Timeline Line */}
            <span
              className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-[var(--border-subtle)]"
              aria-hidden="true"
            ></span>

            {/* Items for this date */}
            <div className="relative space-y-3 pl-8">
              {dateTouches.map((touch) => (
                <TouchTimelineCard
                  key={touch.id}
                  touch={touch}
                  contactName={touch.contactId ? contactMap.get(touch.contactId) : undefined}
                  onEdit={() => onEdit(touch)}
                  onDelete={() => onDelete(touch)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TouchTimelineCard({
  touch,
  contactName,
  onEdit,
  onDelete,
}: {
  touch: MarketingTouch
  contactName?: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { icon: TypeIcon, label: typeLabel } = TOUCH_TYPE_LABELS[touch.touchType] || {
    label: touch.touchType,
    icon: Hash,
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative flex items-start space-x-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm"
    >
      {/* Icon */}
      <div className="absolute -left-12 top-4 z-0">
         <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] ring-8 ring-[var(--surface-elev-1)]">
            <TypeIcon className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
         </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {contactName || 'Unknown Contact'}
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">
            {new Date(touch.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Santo_Domingo',
              })}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
           <ChannelBadge channel={touch.channel} />
           <TouchTypeBadge type={touch.touchType} />
        </div>
        <div className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
          {touch.utmSource && (
            <p><strong>Source:</strong> {touch.utmSource}</p>
          )}
           {touch.utmCampaign && (
            <p><strong>Campaign:</strong> {touch.utmCampaign}</p>
          )}
           {touch.cost > 0 && (
            <p><strong>Cost:</strong> {formatCurrencyRD(touch.cost)}</p>
          )}
        </div>
      </div>
      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
         <RowActions onEdit={onEdit} onDelete={onDelete} isPending={false} />
      </div>
    </motion.div>
  )
}

/*
|--------------------------------------------------------------------------
| Helper: Badges
|--------------------------------------------------------------------------
*/
function ChannelBadge({ channel }: { channel: MarketingChannel }) {
  const color = CHANNEL_COLORS[channel] || CHANNEL_COLORS.other
  const darkText = ['#25F4EE'].includes(color) // For TikTok
  return (
    <span
      className="rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color,
        color: darkText ? '#1B2230' : '#FFFFFF',
      }}
    >
      {MARKETING_CHANNEL_LABELS[channel] || channel}
    </span>
  )
}

function TouchTypeBadge({ type }: { type: TouchType }) {
  const { label, icon: Icon } = TOUCH_TYPE_LABELS[type] || {
    label: type,
    icon: Hash,
  }
  return (
    <span
      className={clsx(
        'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium',
        'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
      )}
    >
      <Icon size={14} />
      {label}
    </span>
  )
}

/*
|--------------------------------------------------------------------------
| Helper: Floating Menu for Rows
|--------------------------------------------------------------------------
*/
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

  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

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
            className="fixed z-10 w-36 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}
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
          document.body,
        )}
    </div>
  )
}