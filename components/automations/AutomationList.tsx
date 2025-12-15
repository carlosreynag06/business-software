// components/automations/AutomationList.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import type { Automation } from '@/app/(app)/automations/actions'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
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

type AutomationStatus = 'success' | 'error' | 'never'

// Friendly labels for UI
const STATUS_LABELS: Record<AutomationStatus, string> = {
  success: 'Success',
  error: 'Error',
  never: 'Never Run',
}

const STATUS_ICONS: Record<AutomationStatus, React.ElementType> = {
  success: CheckCircle,
  error: XCircle,
  never: Clock,
}

const STATUS_COLORS: Record<AutomationStatus, string> = {
  success: 'text-[var(--success)]',
  error: 'text-[var(--danger)]',
  never: 'text-[var(--text-secondary)]',
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const formatDateTime = (isoString?: string | null) => {
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
| Automation List Component (Table View)
|--------------------------------------------------------------------------
*/
interface AutomationListProps {
  automations: Automation[]
  onToggle: (id: string, newIsActive: boolean) => void
  onViewLog: (auto: Automation) => void
  onEdit: (auto: Automation) => void
  onDelete: (auto: Automation) => void
  isPending: boolean
}

export default function AutomationList({
  automations,
  onToggle,
  onViewLog,
  onEdit,
  onDelete,
  isPending,
}: AutomationListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <Th>Status</Th>
            <Th>Automation</Th>
            <Th>Trigger</Th>
            <Th>Last Run</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {automations.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No automations match the current filters.
              </td>
            </tr>
          )}
          {automations.map((auto) => (
            <AutomationRow
              key={auto.id}
              automation={auto}
              onToggle={onToggle}
              onViewLog={onViewLog}
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
function AutomationRow({
  automation,
  onToggle,
  onViewLog,
  onEdit,
  onDelete,
  isPending,
}: {
  automation: Automation
  onToggle: (id: string, newIsActive: boolean) => void
  onViewLog: (auto: Automation) => void
  onEdit: (auto: Automation) => void
  onDelete: (auto: Automation) => void
  isPending: boolean
}) {
  const StatusIcon = STATUS_ICONS[automation.lastRunStatus] || Clock
  
  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)]">
      <td className="w-[120px] px-5 py-4">
        <Switch
          id={`toggle-${automation.id}`}
          checked={automation.isActive}
          onChange={(newIsActive) => onToggle(automation.id, newIsActive)}
          disabled={isPending}
        />
      </td>
      <td className="max-w-sm px-5 py-4">
        <div className="font-medium text-[var(--text-primary)]">{automation.name}</div>
        <div className="truncate text-sm text-[var(--text-secondary)]">{automation.description}</div>
      </td>
      <td className="max-w-xs truncate whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {automation.trigger}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <div className={clsx("flex items-center gap-1.5", STATUS_COLORS[automation.lastRunStatus])}>
          <StatusIcon size={14} />
          <span className="font-medium">{STATUS_LABELS[automation.lastRunStatus]}</span>
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          {formatDateTime(automation.lastRun)}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onViewLog={() => onViewLog(automation)}
          onEdit={() => onEdit(automation)}
          onDelete={() => onDelete(automation)}
          isPending={isPending}
        />
      </td>
    </tr>
  )
}

/*
|--------------------------------------------------------------------------
| Helper: Floating Menu for Rows
|--------------------------------------------------------------------------
*/
function RowActions({
  onViewLog,
  onEdit,
  onDelete,
  isPending,
}: {
  onViewLog: () => void
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
              onClick={() => handleAction(onViewLog)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Eye size={14} /> View Log
            </button>
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

/*
|--------------------------------------------------------------------------
| Helper: Switch Toggle Component
|--------------------------------------------------------------------------
*/
interface SwitchProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function Switch({ id, checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
        checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span className="sr-only">Toggle</span>
      <span
        aria-hidden="true"
        className={clsx(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}