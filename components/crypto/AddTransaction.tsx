// components/crypto/AddTransaction.tsx
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CryptoTransaction,
  TransactionType,
  Asset,
  TRANSACTION_TYPES,
  CRYPTO_ASSETS,
  FIAT_ASSETS,
  ALL_ASSETS,
} from '@/lib/crypto.types'
import { Button } from '@/components/ui/Button'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useToast } from '@/components/ToastProvider'

/*
|--------------------------------------------------------------------------
| Constants & Helpers
|--------------------------------------------------------------------------
*/

// --- NEW: Filter out BTC types ---
const USD_TRANSACTION_TYPES = TRANSACTION_TYPES.filter(
  (t) => !t.includes('BTC')
)
const USD_ALL_ASSETS = ALL_ASSETS.filter((a) => a !== 'BTC')

// Re-usable input class from your other components
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

// --- FIXED: formatCurrencyUSD helper ---
const formatCurrencyUSD = (value: number | undefined | null) => {
  if (value === undefined || value === null) value = 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
// ------------------------------------

/**
 * A re-usable form row component for consistent layout
 */
function FormRow({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>
      )}
    </div>
  )
}

/**
 * Converts an ISO date string to a 'YYYY-MM-DD' string for date inputs
 */
const toHtmlDate = (isoDate?: string | null): string => {
  if (!isoDate) return new Date().toISOString().split('T')[0]
  try {
    return new Date(isoDate).toISOString().split('T')[0]
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Form state shape. Uses strings for number inputs to handle empty fields.
 */
type FormState = {
  date: string
  type: TransactionType
  asset: Asset
  amount: string
  totalUsd: string // CHANGED: Replaced unitPriceUsd
  feeAmount: string
  feeCurrency: Asset
  client: string
  phone: string
  city: string
  notes: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

/*
|--------------------------------------------------------------------------
| AddTransaction Component
|--------------------------------------------------------------------------
*/

interface AddTransactionProps {
  initialData: CryptoTransaction | null
  onSave: (tx: CryptoTransaction) => void
  onCancel: () => void
  isSaving: boolean
}

export default function AddTransaction({
  initialData,
  onSave,
  onCancel,
  isSaving,
}: AddTransactionProps) {
  const isEditing = !!initialData
  const { notify } = useToast()

  const getInitialState = useCallback((): FormState => {
    return {
      date: toHtmlDate(initialData?.date),
      type: initialData?.type || 'Buy USDT', // CHANGED: Default
      asset: initialData?.asset || 'USDT', // CHANGED: Default
      amount: initialData?.amount.toString() || '',
      totalUsd: initialData?.totalUsd?.toString() || '', // CHANGED
      feeAmount: initialData?.feeAmount?.toString() || '',
      feeCurrency: initialData?.feeCurrency || 'USD',
      client: initialData?.client || '',
      phone: initialData?.phone || '',
      city: initialData?.city || '',
      notes: initialData?.notes || '',
    }
  }, [initialData])

  const [formState, setFormState] = useState<FormState>(getInitialState())
  const [errors, setErrors] = useState<FormErrors>({})

  // Reset form when initialData or open state changes
  useEffect(() => {
    setFormState(getInitialState())
    setErrors({})
  }, [getInitialState])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value as any }))
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  // --- Dynamic Logic ---

  const isUsdtTrade = useMemo(() => {
    return ['Buy USDT', 'Sell USDT'].includes(
      formState.type
    )
  }, [formState.type])

  /**
   * Automatically update the 'Asset' field based on the 'Type'
   */
  useEffect(() => {
    let newAsset: Asset = 'USD'
    switch (formState.type) {
      // REMOVED: Buy/Sell BTC cases
      case 'Buy USDT':
      case 'Sell USDT':
        newAsset = 'USDT'
        break
      case 'Deposit Cash':
      case 'Withdraw Cash':
      case 'Marketing Expense':
        newAsset = 'USD'
        break
    }
    setFormState((prev) => ({ ...prev, asset: newAsset }))
  }, [formState.type])

  // --- REMOVED: calculatedTotalUsd useMemo ---

  // --- Validation & Save ---

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {}
    const {
      date,
      type,
      amount,
      totalUsd, // CHANGED
      feeAmount,
      client,
    } = formState

    if (!date) newErrors.date = 'Date is required'
    if (!type) newErrors.type = 'Type is required'

    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Amount must be a positive number'
    }

    // --- *** THIS IS THE FIX *** ---
    // Only validate totalUsd if it's a USDT trade (when the field is visible)
    if (isUsdtTrade) {
      const totalNum = parseFloat(totalUsd)
      if (!totalUsd || isNaN(totalNum) || totalNum <= 0) {
        newErrors.totalUsd = 'Total USD must be a positive number'
      }
    }
    // --- *** END FIX *** ---

    // The client field is required for ALL transaction types per the schema.
    if (!client) {
      if (isUsdtTrade) {
        newErrors.client = 'Client name is required for trades'
      } else if (formState.type === 'Marketing Expense') {
        newErrors.client = 'Vendor/Payee is required (e.g., Facebook Ads)'
      } else {
        newErrors.client = 'Client/Source is required'
      }
    }

    if (feeAmount) {
      const feeNum = parseFloat(feeAmount)
      if (isNaN(feeNum) || feeNum < 0) {
        newErrors.feeAmount = 'Fee must be a valid number'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formState, isUsdtTrade]) // Added isUsdtTrade dependency

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      notify({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'danger',
      })
      return
    }
    
    const amountNum = parseFloat(formState.amount) || 0
    const totalNum = parseFloat(formState.totalUsd) || 0

    // Convert form state back to CryptoTransaction type
    const payload: CryptoTransaction = {
      id: initialData?.id || '', // ID will be set by parent/server if new
      date: new Date(formState.date + 'T12:00:00Z').toISOString(), // Store as UTC noon
      type: formState.type,
      asset: formState.asset,
      amount: amountNum,
      unitPriceUsd: null, // REMOVED
      // If it's a trade, use the entered total. If not (Deposit/Withdraw/etc), Total is just the Amount.
      totalUsd: isUsdtTrade ? totalNum : amountNum, // CHANGED
      feeAmount: parseFloat(formState.feeAmount) || 0,
      feeCurrency: formState.feeAmount ? formState.feeCurrency : null,
      client: formState.client,
      phone: formState.phone || null,
      city: formState.city || null,
      notes: formState.notes || null,
    }
    onSave(payload)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Scrollable Form Body */}
      <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow label="Date" htmlFor="date" error={errors.date}>
            <input
              id="date"
              name="date"
              type="date"
              value={formState.date}
              onChange={handleChange}
              className={clsx(
                inputBaseClass,
                errors.date && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            />
          </FormRow>
          <FormRow label="Type" htmlFor="type" error={errors.type}>
            <select
              id="type"
              name="type"
              value={formState.type}
              onChange={handleChange}
              className={clsx(
                inputBaseClass,
                errors.type && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            >
              {/* --- FIXED: Use filtered types --- */}
              {USD_TRANSACTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </FormRow>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow label="Asset" htmlFor="asset">
            <input
              id="asset"
              name="asset"
              type="text"
              value={formState.asset}
              className={clsx(
                inputBaseClass,
                'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              )}
              disabled
            />
          </FormRow>

          {/* --- FIXED: Label is now dynamic --- */}
          <FormRow
            label={isUsdtTrade ? "Amount (USDT)" : "Amount (USD)"}
            htmlFor="amount"
            error={errors.amount}
          >
            <input
              id="amount"
              name="amount"
              type="number"
              value={formState.amount}
              onChange={handleChange}
              placeholder={isUsdtTrade ? "e.g., 1000" : "e.g., 5000"}
              step="any"
              className={clsx(
                inputBaseClass,
                errors.amount && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            />
          </FormRow>
        </div>

        {/* --- FIXED: This is now the "Total (USD)" input field --- */}
        {isUsdtTrade && (
          <FormRow
            label="Total (USD)"
            htmlFor="totalUsd"
            error={errors.totalUsd}
          >
            <input
              id="totalUsd"
              name="totalUsd"
              type="number"
              value={formState.totalUsd}
              onChange={handleChange}
              placeholder="e.g., 1000.50"
              step="any"
              className={clsx(
                inputBaseClass,
                errors.totalUsd && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            />
          </FormRow>
        )}
        
        {/* --- REMOVED: Auto-calculated total field --- */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormRow
            label="Fee Amount (Optional)"
            htmlFor="feeAmount"
            error={errors.feeAmount}
          >
            <input
              id="feeAmount"
              name="feeAmount"
              type="number"
              value={formState.feeAmount}
              onChange={handleChange}
              placeholder="e.g., 5"
              step="any"
              className={clsx(
                inputBaseClass,
                errors.feeAmount && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            />
          </FormRow>
          <FormRow label="Fee Currency" htmlFor="feeCurrency">
            <select
              id="feeCurrency"
              name="feeCurrency"
              value={formState.feeCurrency}
              onChange={handleChange}
              className={inputBaseClass}
              disabled={isSaving || !formState.feeAmount}
            >
              {/* --- FIXED: Use filtered assets --- */}
              {USD_ALL_ASSETS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </FormRow>
        </div>

        <hr className="border-[var(--border-subtle)]" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormRow label="Client" htmlFor="client" error={errors.client}>
            <input
              id="client"
              name="client"
              type="text"
              value={formState.client}
              onChange={handleChange}
              placeholder="e.g., Juan Perez"
              className={clsx(
                inputBaseClass,
                errors.client && 'border-[var(--danger)]'
              )}
              disabled={isSaving}
            />
          </FormRow>
          <FormRow label="Phone (Optional)" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formState.phone}
              onChange={handleChange}
              placeholder="e.g., 809-555-1234"
              className={inputBaseClass}
              disabled={isSaving}
            />
          </FormRow>
          <FormRow label="City (Optional)" htmlFor="city">
            <input
              id="city"
              name="city"
              type="text"
              value={formState.city}
              onChange={handleChange}
              placeholder="e.g., Puerto Plata"
              className={inputBaseClass}
              disabled={isSaving}
            />
          </FormRow>
        </div>

        <FormRow label="Notes (Optional)" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            value={formState.notes}
            onChange={handleChange}
            rows={3}
            className={inputBaseClass}
            disabled={isSaving}
          />
        </FormRow>
      </div>

      {/* Form Footer */}
      <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            'Save Transaction'
          )}
        </Button>
      </div>
    </form>
  )
}