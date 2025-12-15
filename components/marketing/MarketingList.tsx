// components/marketing/MarketingList.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import type {
  MarketingTouch,
  Lead,
  Contact,
  MarketingChannel,
  TouchType,
} from '@/lib/types'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Mail,
  MousePointerClick,
  QrCode,
  Store,
  Eye,
  Phone,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| View 1: Table View
|--------------------------------------------------------------------------
*/
interface MarketingListProps {
  touches: MarketingTouch[]
  contactMap: Map<string, string>
  onEdit: (touch: MarketingTouch) => void
  onDelete: (touch: MarketingTouch) => void
  isPending: boolean
}

export default function MarketingList({
  touches,
  contactMap,
  onEdit,
  onDelete,
  isPending,
}: MarketingListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <Th>Date</Th>
            <Th>Channel</Th>
            <Th>Type</Th>
            <Th>Contact</Th>
            <Th>UTM Source</Th>
            <Th>UTM Campaign</Th>
            <Th>Cost (RD$)</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {touches.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No touchpoints match the current filters.
              </td>
            </tr>
          )}
          {touches.map((touch) => (
            <TouchRow
              key={touch.id}
              touch={touch}
              contactName={touch.contactId ? contactMap.get(touch.contactId) : undefined}
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

// Table Header Cell
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
      {children}
    </th>
  )
}

// Table Row Component
function TouchRow({
  touch,
  contactName,
  onEdit,
  onDelete,
  isPending,
}: {
  touch: MarketingTouch
  contactName?: string
  onEdit: (touch: MarketingTouch) => void
  onDelete: (touch: MarketingTouch) => void
  isPending: boolean
}) {
  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)]">
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {formatDate(touch.timestamp)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <ChannelBadge channel={touch.channel} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <TouchTypeBadge type={touch.touchType} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
        {contactName || <span className="text-[var(--text-tertiary)]">N/A</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {touch.utmSource || <span className="text-[var(--text-tertiary)]">--</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {touch.utmCampaign || <span className="text-[var(--text-tertiary)]">--</span>}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
        {formatCurrencyRD(touch.cost)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onEdit={() => onEdit(touch)}
          onDelete={() => onDelete(touch)}
          isPending={isPending}
        />
      </td>
    </tr>
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