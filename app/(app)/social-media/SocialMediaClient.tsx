// app/(app)/social-media/SocialMediaClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  SocialMediaCampaign,
  ContentCalendarItem,
  CampaignStatus,
  MarketingChannel,
  ContentStatus,
} from '@/lib/types'
import {
  getSocialMediaData,
  upsertCampaign,
  deleteCampaign,
  upsertContentItem,
  deleteContentItem,
} from './actions'
import {
  Megaphone,
  Calendar,
  Plus,
  Search,
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  Instagram,
  Facebook,
  Youtube,
  Image as ImageIcon,
  Link as LinkIcon,
  X,
  MoreHorizontal,
  Edit,
  Trash2,
  ListFilter,
  Check,
  PauseCircle,
  PlayCircle,
  XCircle,
  Flag,
} from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
// CORRECTED IMPORT
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventInput, ResourceInput } from '@fullcalendar/core'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

// Import new modal components
import CampaignFormModal from '@/components/social/CampaignFormModal'
import ContentFormModal from '@/components/social/ContentFormModal'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
type View = 'calendar' | 'campaigns'

type KpiData = {
  activeCampaigns: number
  scheduledPosts: number
  needsApproval: number
}

const CHANNEL_RESOURCES: ResourceInput[] = [
  {
    id: 'instagram',
    title: 'Instagram',
    eventColor: '#E1306C',
  },
  {
    id: 'facebook',
    title: 'Facebook',
    eventColor: '#1877F2',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    eventColor: '#25F4EE',
  },
  {
    id: 'youtube',
    title: 'YouTube',
    eventColor: '#FF0000',
  },
  {
    id: 'google_ads',
    title: 'Google Ads',
    eventColor: '#4285F4',
  },
  {
    id: 'other',
    title: 'Other',
    eventColor: '#7A7572',
  },
]

const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = [
  'planning',
  'active',
  'paused',
  'completed',
  'canceled',
]

const ALL_CONTENT_STATUSES: ContentStatus[] = [
  'planned',
  'approved',
  'posted',
  'skipped',
]

const STATUS_COLORS: Record<ContentStatus, string> = {
  planned: 'var(--info)',
  approved: 'var(--secondary)',
  posted: 'var(--success)',
  skipped: 'var(--danger)',
}

const STATUS_ICONS: Record<ContentStatus, React.ElementType> = {
  planned: Clock,
  approved: Check,
  posted: CheckCircle,
  skipped: XCircle,
}

const CAMPAIGN_STATUS_ICONS: Record<CampaignStatus, React.ElementType> = {
  planning: Clock,
  active: PlayCircle,
  paused: PauseCircle,
  completed: CheckCircle,
  canceled: XCircle,
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
const kpiIcons = {
  activeCampaigns: Megaphone,
  scheduledPosts: Calendar,
  needsApproval: FileText,
}

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


const formatCurrencyRD = (value: number | undefined) => {
  if (value === undefined) value = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
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
  } catch (e) {
    return 'Invalid Date'
  }
}

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
interface SocialMediaClientProps {
  initialCampaigns: SocialMediaCampaign[]
  initialContentItems: ContentCalendarItem[]
  initialKpis: KpiData
}

export default function SocialMediaClient({
  initialCampaigns,
  initialContentItems,
  initialKpis,
}: SocialMediaClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- View State ---
  const [view, setView] = useState<View>('calendar')

  // --- Data State ---
  const [campaigns, setCampaigns] = useState(initialCampaigns)
  const [contentItems, setContentItems] = useState(initialContentItems)
  const [kpis, setKpis] = useState(initialKpis)

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCampaignStatus, setFilterCampaignStatus] =
    useState<'all' | CampaignStatus>('all')

  // --- Modal State ---
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] =
    useState<SocialMediaCampaign | null>(null)
  const [editingContent, setEditingContent] =
    useState<ContentCalendarItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<{
    id: string
    name: string
    type: 'campaign' | 'content'
  } | null>(null)

  // Sync server data (for router.refresh)
  useEffect(() => setCampaigns(initialCampaigns), [initialCampaigns])
  useEffect(() => setContentItems(initialContentItems), [initialContentItems])
  useEffect(() => setKpis(initialKpis), [initialKpis])

  // --- Memos for Filtered Data ---
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const query = searchQuery.toLowerCase()
      const nameMatch = campaign.brandAccount.toLowerCase().includes(query)
      const statusMatch =
        filterCampaignStatus === 'all' ||
        campaign.status === filterCampaignStatus
      return nameMatch && statusMatch
    })
  }, [campaigns, searchQuery, filterCampaignStatus])

  const calendarEvents = useMemo(() => {
    return contentItems.map((item) => ({
      id: item.id,
      resourceId: item.channel,
      title: item.caption || 'No Caption',
      start: item.publishDatetime,
      end: item.publishDatetime, // Treat as point-in-time
      allDay: false,
      extendedProps: item,
      backgroundColor: STATUS_COLORS[item.status],
      borderColor: STATUS_COLORS[item.status],
      textColor:
        item.status === 'planned'
          ? 'var(--text-primary)'
          : 'var(--sidebar-text)',
    }))
  }, [contentItems])

  // --- Handlers ---
  const handleOpenAddModal = () => {
    if (view === 'calendar') {
      setEditingContent(null)
      setIsContentModalOpen(true)
    } else {
      setEditingCampaign(null)
      setIsCampaignModalOpen(true)
    }
  }

  const handleOpenEditCampaign = (campaign: SocialMediaCampaign) => {
    setEditingCampaign(campaign)
    setIsCampaignModalOpen(true)
  }

  const handleOpenEditContent = (item: ContentCalendarItem) => {
    setEditingContent(item)
    setIsContentModalOpen(true)
  }

  const handleOpenDeleteConfirm = (item: {
    id: string
    name: string
    type: 'campaign' | 'content'
  }) => {
    setItemToDelete(item)
  }

  const handleSaveCampaign = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'
      // MOCK ACTION
      console.log('MOCK: Saving campaign...', formData)
      await new Promise((res) => setTimeout(res, 500))
      notify({
        title: `Campaign ${actionType}`,
        description: `${formData.brandAccount} has been saved.`,
        variant: 'success',
      })
      setIsCampaignModalOpen(false)
      setEditingCampaign(null)
      router.refresh()
    })
  }

  const handleSaveContent = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'
      // MOCK ACTION
      console.log('MOCK: Saving content...', formData)
      await new Promise((res) => setTimeout(res, 500))
      notify({
        title: `Content ${actionType}`,
        description: `Post for ${formData.channel} has been saved.`,
        variant: 'success',
      })
      setIsContentModalOpen(false)
      setEditingContent(null)
      router.refresh()
    })
  }

  const handleConfirmDelete = () => {
    if (!itemToDelete) return

    startTransition(async () => {
      const { id, name, type } = itemToDelete
      // MOCK ACTION
      console.log(`MOCK: Deleting ${type}...`, id)
      await new Promise((res) => setTimeout(res, 500))

      notify({
        title: `${type === 'campaign' ? 'Campaign' : 'Post'} Deleted`,
        description: `${name} has been deleted.`,
        variant: 'success',
      })
      setItemToDelete(null)
      router.refresh()
    })
  }

  return (
    <>
      <style jsx global>{`
        /* FullCalendar Customizations for Social Media */
        .fc-event {
          cursor: pointer;
          border: none !important;
          padding: 4px 6px;
          border-radius: var(--radius-sm) !important;
          box-shadow: var(--shadow-1);
        }
        .fc-event-main {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
        }
        .fc-event-title {
          font-weight: 500;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* Resource (Channel) Labels */
        .fc-resource-lane-title {
          font-weight: 600 !important;
          font-size: 14px !important;
          padding: 10px !important;
          text-transform: capitalize;
        }
      `}</style>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Social Media
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Manage campaigns and plan your content calendar
            </p>
          </div>
          <Button onClick={handleOpenAddModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            {view === 'calendar' ? 'Add Post' : 'Add Campaign'}
          </Button>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <KpiCard
            title="Active Campaigns"
            value={kpis.activeCampaigns.toString()}
            icon={kpiIcons.activeCampaigns}
            color="primary"
          />
          <KpiCard
            title="Scheduled Posts (Next 7d)"
            value={kpis.scheduledPosts.toString()}
            icon={kpiIcons.scheduledPosts}
            color="secondary"
          />
          <KpiCard
            title="Needs Approval"
            value={kpis.needsApproval.toString()}
            icon={kpiIcons.needsApproval}
            color="warning"
          />
        </div>

        {/* 3. View Toggles & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-shrink-0 items-center gap-2">
            <TabButton
              label="Calendar"
              icon={Calendar}
              isActive={view === 'calendar'}
              onClick={() => setView('calendar')}
            />
            <TabButton
              label="Campaigns"
              icon={Megaphone}
              isActive={view === 'campaigns'}
              onClick={() => setView('campaigns')}
            />
          </div>

          <div className="flex w-full min-w-0 flex-1 items-center gap-3">
            <div className="relative w-full flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder={
                  view === 'campaigns'
                    ? 'Search campaigns...'
                    : 'Search posts...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>
            {view === 'campaigns' && (
              <select
                value={filterCampaignStatus}
                onChange={(e) =>
                  setFilterCampaignStatus(
                    e.target.value as 'all' | CampaignStatus,
                  )
                }
                className={clsx(inputBaseClass, 'w-48')}
              >
                <option value="all">All Statuses</option>
                {ALL_CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            )}
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
              {view === 'calendar' && (
                <CalendarView
                  events={calendarEvents}
                  onEdit={handleOpenEditContent}
                />
              )}
              {view === 'campaigns' && (
                <CampaignsView
                  campaigns={filteredCampaigns}
                  onEdit={handleOpenEditCampaign}
                  onDelete={handleOpenDeleteConfirm}
                  isPending={isPending}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <CampaignFormModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSave={handleSaveCampaign}
        initialData={editingCampaign}
        isSaving={isPending}
      />

      <ContentFormModal
        isOpen={isContentModalOpen}
        onClose={() => setIsContentModalOpen(false)}
        onSave={handleSaveContent}
        initialData={editingContent}
        isSaving={isPending}
        campaigns={campaigns}
      />

      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete ${itemToDelete?.type === 'campaign' ? 'Campaign' : 'Post'}`}
      >
        Are you sure you want to delete the
        {itemToDelete?.type === 'campaign' ? ' campaign' : ' post'}{' '}
        <strong>"{itemToDelete?.name}"</strong>? This action cannot be undone.
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
| Tab Button Sub-Component
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
| View 1: Calendar View
|--------------------------------------------------------------------------
*/
function CalendarView({
  events,
  onEdit,
}: {
  events: EventInput[]
  onEdit: (item: ContentCalendarItem) => void
}) {
  const calendarRef = useRef<FullCalendar>(null)

  // Custom Event Renderer
  const renderEventContent = (eventInfo: any) => {
    const item = eventInfo.event.extendedProps as ContentCalendarItem
    const StatusIcon = STATUS_ICONS[item.status] || Flag

    return (
      <div className="fc-event-main">
        <StatusIcon
          size={14}
          className="flex-shrink-0"
          style={{
            color:
              item.status === 'planned'
                ? 'var(--text-primary)'
                : 'var(--sidebar-text)',
          }}
        />
        <div className="fc-event-title">{eventInfo.event.title}</div>
      </div>
    )
  }

  const handleEventClick = (clickInfo: any) => {
    onEdit(clickInfo.event.extendedProps as ContentCalendarItem)
  }

  return (
    <div className="h-full min-h-[70vh]">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineWeek"
        schedulerLicenseKey="GPL-TO-BE-REPLACED"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
        }}
        editable={true}
        selectable={true}
        eventClick={handleEventClick}
        events={events}
        resources={CHANNEL_RESOURCES}
        resourceAreaHeaderContent="Channels"
        resourceAreaWidth="150px"
        eventContent={renderEventContent}
        height="100%"
        contentHeight="auto"
        timeZone="America/Santo_Domingo"
        locale="en"
        slotMinWidth={100}
      />
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| View 2: Campaigns View
|--------------------------------------------------------------------------
*/
function CampaignsView({
  campaigns,
  onEdit,
  onDelete,
  isPending,
}: {
  campaigns: SocialMediaCampaign[]
  onEdit: (campaign: SocialMediaCampaign) => void
  onDelete: (item: {
    id: string
    name: string
    type: 'campaign' | 'content'
  }) => void
  isPending: boolean
}) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Brand Account
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Channels
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Budget (RD$)
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Dates
            </th>
            <th className="relative px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {campaigns.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No campaigns match the current filters.
              </td>
            </tr>
          )}
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onEdit={() => onEdit(campaign)}
              onDelete={() =>
                onDelete({
                  id: campaign.id,
                  name: campaign.brandAccount,
                  type: 'campaign',
                })
              }
              isPending={isPending}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CampaignRow({
  campaign,
  onEdit,
  onDelete,
  isPending,
}: {
  campaign: SocialMediaCampaign
  onEdit: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const StatusIcon = CAMPAIGN_STATUS_ICONS[campaign.status] || Flag
  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)]">
      <td className="whitespace-nowrap px-5 py-4">
        <div className="font-medium text-[var(--text-primary)]">
          {campaign.brandAccount}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4">
        <span
          className={clsx(
            'flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize',
            campaign.status === 'active'
              ? 'bg-[var(--success)]/10 text-[var(--success)]'
              : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
          )}
        >
          <StatusIcon size={14} />
          {campaign.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)] capitalize">
        {campaign.channels.join(', ')}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
        {formatCurrencyRD(campaign.budgetTotal)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onEdit={onEdit}
          onDelete={onDelete}
          isPending={isPending}
        />
      </td>
    </tr>
  )
}

/*
|--------------------------------------------------------------------------
| Re-usable Floating Menu for Rows
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