// components/crypto/CryptoTable.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
// Types are now USD-based
import type { CryptoTransaction, LivePrices } from '@/lib/crypto.types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Formats an ISO date string to a readable date
 */
const formatDate = (isoString?: string | null) => {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch (e) {
    return 'Invalid Date'
  }
}

/**
 * Formats a number as United States Dollars
 */
const formatCurrencyUSD = (value: number | undefined | null) => {
  if (value === undefined || value === null) value = 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Calculates the USD equivalent of a fee
 */
const getFeeUsdEquivalent = (
  tx: CryptoTransaction
): number => {
  if (!tx.feeAmount || !tx.feeCurrency) {
    return 0
  }
  if (tx.feeCurrency === 'USD') {
    return tx.feeAmount
  }
  // REMOVED: BTC logic
  if (tx.feeCurrency === 'USDT') {
    // Assume 1 USDT = 1 USD
    return tx.feeAmount * 1
  }
  return 0
}

/*
|--------------------------------------------------------------------------
| Main Table Component
|--------------------------------------------------------------------------
*/
interface CryptoTableProps {
  transactions: CryptoTransaction[]
  // REMOVED: livePrices prop
  onEdit: (tx: CryptoTransaction) => void
  onDelete: (tx: CryptoTransaction) => void
  isPending: boolean
}

export default function CryptoTable({
  transactions,
  // REMOVED: livePrices
  onEdit,
  onDelete,
  isPending,
}: CryptoTableProps) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <Th>Date</Th>
            <Th>Type</Th>
            <Th>Asset</Th>
            <Th>Amount</Th>
            {/* REMOVED: Unit Price (USD) column */}
            <Th>Total (USD)</Th>
            <Th>Fee (USD)</Th>
            <Th>Client</Th>
            <Th>Phone</Th>
            <Th>City</Th>
            <Th>Notes</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {transactions.length === 0 && (
            <tr>
              {/* FIXED: Colspan changed from 12 to 11 */}
              <Td colSpan={11} className="py-10 text-center text-sm text-[var(--text-secondary)]">
                No transactions match the current filters.
              </Td>
            </tr>
          )}
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="group transition-colors hover:bg-[var(--bg-muted)]"
            >
              <Td className="whitespace-nowrap">{formatDate(tx.date)}</Td>
              <Td className="whitespace-nowrap">{tx.type}</Td>
              <Td className="whitespace-nowrap font-medium">{tx.asset}</Td>
              <Td className="whitespace-nowrap text-right">
                {tx.amount.toLocaleString(undefined, {
                  maximumFractionDigits: tx.asset === 'USD' ? 2 : 8,
                })}
              </Td>
              
              {/* REMOVED: Unit Price (USD) cell */}
              
              <Td className="whitespace-nowrap text-right font-medium text-[var(--text-primary)]">
                {formatCurrencyUSD(tx.totalUsd)}
              </Td>
              <Td className="whitespace-nowrap text-right text-[var(--text-secondary)]">
                {/* REMOVED: livePrices argument */}
                {formatCurrencyUSD(getFeeUsdEquivalent(tx))}
              </Td>
              <Td className="whitespace-nowrap text-[var(--text-primary)]">
                {tx.client}
              </Td>
              <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                {tx.phone || '---'}
              </Td>
              <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                {tx.city || '---'}
              </Td>
              <Td className="max-w-xs truncate" title={tx.notes || ''}>
                {tx.notes || '---'}
              </Td>
              <Td className="text-right">
                <RowActions
                  tx={tx}
                  onEdit={() => onEdit(tx)}
                  onDelete={() => onDelete(tx)}
                  isPending={isPending}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Table Cell Helpers
|--------------------------------------------------------------------------
*/

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <th
      className={clsx(
        'px-4 py-3 text-xs font-semibold uppercase text-[var(--text-secondary)]',
        align === 'left' ? 'text-left' : 'text-right'
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      colSpan={colSpan}
      className={clsx(
        'px-4 py-3 text-sm text-[var(--text-secondary)]',
        className
      )}
    >
      {children}
    </td>
  )
}

/*
|--------------------------------------------------------------------------
| Floating Menu for Row Actions
|--------------------------------------------------------------------------
*/
function RowActions({
  tx,
  onEdit,
  onDelete,
  isPending,
}: {
  tx: CryptoTransaction
  onEdit: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      // Align menu right edge to button's right edge
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right,
      })
      setIsOpen(true)
    }
  }

  // Close on outside click
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
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
        className="rounded-md p-1 text-[var(--text-secondary)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
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
            className="fixed z-50 w-48 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Edit size={14} /> Edit Transaction
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 size={14} /> Delete Transaction
            </button>
          </motion.div>,
          document.body
        )}
    </div>
  )
}