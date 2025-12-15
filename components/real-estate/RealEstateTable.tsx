// components/real-estate/RealEstateTable.tsx
'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import type { RealEstateDeal } from '@/lib/real-estate.types'
import { Button } from '@/components/ui/Button'

interface RealEstateTableProps {
  deals: RealEstateDeal[]
  isPending: boolean
  onEdit: (deal: RealEstateDeal) => void
  onViewDetails: (deal: RealEstateDeal) => void
  onDelete: (deal: RealEstateDeal) => void
  onMarkSold: (deal: RealEstateDeal) => void
}

const headerCellClass =
  'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-left border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]'
const bodyCellClass =
  'px-3 py-2 text-sm text-[var(--text-primary)] border-b border-[var(--border-subtle)] align-top'

function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-'
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function formatCommission(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '-'
  const trimmed = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(2).replace(/\.00$/, '')
  return `${trimmed}%`
}

function formatType(type: RealEstateDeal['clientType']): string {
  if (type === 'buyer') return 'Buyer'
  if (type === 'seller') return 'Seller'
  return type
}

function formatStatus(
  status: RealEstateDeal['status'],
): { label: string; className: string } {
  if (status === 'sold') {
    // SOLD = green (success) badge
    return {
      label: 'Sold',
      className:
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--success)] text-white',
    }
  }
  // ACTIVE = blue (primary) badge
  return {
    label: 'Active',
    className:
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-[var(--primary-050)] text-[var(--primary-700)]',
  }
}

export default function RealEstateTable({
  deals,
  isPending,
  onEdit,
  onViewDetails,
  onDelete,
  onMarkSold,
}: RealEstateTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const handleToggleMenu = (
    id: string,
    event?: React.MouseEvent<HTMLButtonElement>,
  ) => {
    // Stop propagation to prevent row click
    event?.stopPropagation()

    // If this row is already open, close it
    if (openMenuId === id) {
      setOpenMenuId(null)
      setMenuPosition(null)
      return
    }

    // Open menu for this row
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4, // just below button
        right: window.innerWidth - rect.right,
      })
    } else {
      setMenuPosition(null)
    }
    setOpenMenuId(id)
  }

  const handleCloseMenu = () => {
    setOpenMenuId(null)
    setMenuPosition(null)
  }

  const handleViewDetails = (deal: RealEstateDeal) => {
    handleCloseMenu()
    onViewDetails(deal)
  }

  const handleEdit = (deal: RealEstateDeal) => {
    handleCloseMenu()
    onEdit(deal)
  }

  const handleDelete = (deal: RealEstateDeal) => {
    handleCloseMenu()
    onDelete(deal)
  }

  const handleMarkSoldClick = (deal: RealEstateDeal) => {
    handleCloseMenu()
    onMarkSold(deal)
  }

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!openMenuId) return

    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      // Inside menu
      if (menuRef.current && menuRef.current.contains(target)) return

      // On the trigger button
      if (target.closest('[data-real-estate-menu-button="true"]')) return

      handleCloseMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseMenu()
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenuId])

  if (!deals.length && !isPending) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--bg-muted)] px-4 py-6 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          No real estate records yet.
        </p>
        <p className="text-xs text-[var(--text-tertiary)]">
          Use “Add client” to create your first buyer or seller.
        </p>
      </div>
    )
  }

  return (
    <div className="relative overflow-x-auto rounded-[var(--radius-md)]">
      {isPending && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center bg-gradient-to-b from-[var(--bg-surface)]/80 to-transparent pb-1 pt-2">
          <span className="rounded-full bg-[var(--bg-muted)] px-3 py-1 text-xs text-[var(--text-secondary)]">
            Updating…
          </span>
        </div>
      )}
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className={clsx(headerCellClass, 'w-[20%]')}>Client</th>
            <th className={clsx(headerCellClass, 'w-[10%]')}>Date</th>
            <th className={clsx(headerCellClass, 'w-[10%]')}>Type</th>
            <th className={clsx(headerCellClass, 'w-[10%]')}>Status</th>
            <th className={clsx(headerCellClass, 'w-[15%] text-right')}>
              Property value
            </th>
            <th
              className={clsx(
                headerCellClass,
                'w-[10%] text-right whitespace-nowrap',
              )}
            >
              Commission %
            </th>
            <th className={clsx(headerCellClass, 'w-[20%]')}>
              Property address
            </th>
            <th className={clsx(headerCellClass, 'w-[5%] text-right')}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => {
            const statusMeta = formatStatus(deal.status)
            const typeBadgeClass =
              deal.clientType === 'buyer'
                ? // BUYER = cooler blue badge
                  'inline-flex rounded-full bg-[var(--primary-050)] px-2 py-0.5 text-xs font-medium text-[var(--primary-700)]'
                : // SELLER = warm warning accent
                  'inline-flex rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--warning)]'

            return (
              <tr
                key={deal.id}
                onClick={() => onViewDetails(deal)}
                className="group cursor-pointer transition-colors hover:bg-[var(--bg-muted)]/60"
              >
                {/* Client */}
                <td className={bodyCellClass}>
                  <div className="flex flex-col gap-1">
                    {/* Changed from button to span to avoid nested interactive elements */}
                    <span className="inline-flex max-w-full items-center gap-1 text-left text-sm font-medium text-[var(--text-primary)]">
                      <span className="truncate">
                        {deal.clientName || 'Unnamed client'}
                      </span>
                    </span>
                    {deal.clientEmail && (
                      <span className="truncate text-xs text-[var(--text-secondary)]">
                        {deal.clientEmail}
                      </span>
                    )}
                  </div>
                </td>

                {/* Date */}
                <td className={bodyCellClass}>
                  <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {deal.date || '-'}
                  </span>
                </td>

                {/* Type */}
                <td className={bodyCellClass}>
                  <span className={typeBadgeClass}>
                    {formatType(deal.clientType)}
                  </span>
                </td>

                {/* Status */}
                <td className={bodyCellClass}>
                  <span className={statusMeta.className}>
                    <CheckCircle2 className="h-3 w-3" />
                    {statusMeta.label}
                  </span>
                </td>

                {/* Property value */}
                <td className={clsx(bodyCellClass, 'text-right')}>
                  <span className="whitespace-nowrap font-medium">
                    {formatNumber(deal.propertyValue)}
                  </span>
                </td>

                {/* Commission % */}
                <td className={clsx(bodyCellClass, 'text-right')}>
                  <span className="whitespace-nowrap text-sm text-[var(--text-secondary)]">
                    {formatCommission(deal.commissionPercent)}
                  </span>
                </td>

                {/* Property address */}
                <td className={bodyCellClass}>
                  <span className="line-clamp-2 text-sm text-[var(--text-primary)]">
                    {deal.propertyAddress || '-'}
                  </span>
                </td>

                {/* Actions */}
                <td className={clsx(bodyCellClass, 'text-right')}>
                  <div className="relative inline-flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      data-real-estate-menu-button="true"
                      onClick={(e) => handleToggleMenu(deal.id, e)}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === deal.id}
                      className="h-8 w-8 rounded-full"
                    >
                      <MoreHorizontal className="h-4 w-4 text-[var(--text-secondary)]" />
                    </Button>

                    {openMenuId === deal.id && menuPosition && createPortal(
                      <div
                        ref={menuRef}
                        className="fixed z-50 min-w-[160px] rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] py-1 shadow-[var(--shadow-1)]"
                        style={{
                          top: `${menuPosition.top}px`,
                          right: `${menuPosition.right}px`,
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent row click
                      >
                        <button
                          type="button"
                          onClick={() => handleViewDetails(deal)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        >
                          View detail
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(deal)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkSoldClick(deal)}
                          disabled={deal.status === 'sold'}
                          className={clsx(
                            'block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--bg-muted)]',
                            deal.status === 'sold'
                              ? 'cursor-not-allowed text-[var(--text-tertiary)] opacity-70'
                              : 'text-[var(--text-primary)]',
                          )}
                        >
                          {deal.status === 'sold'
                            ? 'Already sold'
                            : 'Mark sold'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(deal)}
                          className="block w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>,
                      document.body,
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}