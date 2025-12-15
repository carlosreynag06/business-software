'use client'

import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import type { Loan, LoanFormValues, LoanFrequency, LoanStatus } from '@/lib/loans.types'
import { LOAN_FREQUENCIES, LOAN_STATUSES } from '@/lib/loans.types'

interface LoansFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (values: LoanFormValues) => void
  initialData: Loan | null
  isSaving: boolean
}

// Re-use same input styling
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

const labelClass = 'text-xs font-medium text-[var(--text-secondary)] mb-1 inline-block'

const defaultFormValues: LoanFormValues = {
  id: undefined,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientAddress: '',
  loanDate: '',
  amount: 0,
  interestRate: 0,
  frequency: 'monthly',
  status: 'active',
  notes: '',
}

export default function LoansForm({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: LoansFormProps) {
  const [formValues, setFormValues] = useState<LoanFormValues>(defaultFormValues)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!initialData

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormValues({
          id: initialData.id,
          clientName: initialData.clientName,
          clientPhone: initialData.clientPhone || '',
          clientEmail: initialData.clientEmail || '',
          clientAddress: initialData.clientAddress || '',
          loanDate: initialData.loanDate,
          amount: initialData.amount,
          interestRate: initialData.interestRate,
          frequency: initialData.frequency,
          status: initialData.status,
          notes: initialData.notes || '',
        })
      } else {
        setFormValues(defaultFormValues)
      }
      setError(null)
    }
  }, [isOpen, initialData])

  const handleChange =
    (field: keyof LoanFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formValues.clientName.trim()) {
      setError('Client name is required.')
      return
    }
    if (!formValues.loanDate) {
      setError('Loan date is required.')
      return
    }
    const amountParsed = Number(formValues.amount)
    const interestParsed = Number(formValues.interestRate)

    if (isNaN(amountParsed) || amountParsed <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (isNaN(interestParsed) || interestParsed < 0) {
      setError('Interest rate must be a valid number.')
      return
    }

    onSave({
      ...formValues,
      amount: amountParsed,
      interestRate: interestParsed,
      clientPhone: formValues.clientPhone || null,
      clientEmail: formValues.clientEmail || null,
      clientAddress: formValues.clientAddress || null,
      notes: formValues.notes || null,
    })
  }

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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={!isSaving ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
              <div>
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Loan' : 'New Loan'}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Enter loan details and client information.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                
                {/* Client Info Section */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Client Information
                  </h3>
                  <div>
                    <label className={labelClass} htmlFor="clientName">
                      Client Name
                    </label>
                    <input
                      id="clientName"
                      type="text"
                      className={inputBaseClass}
                      value={formValues.clientName}
                      onChange={handleChange('clientName')}
                      placeholder="Full Name"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="clientPhone">
                        Phone
                      </label>
                      <input
                        id="clientPhone"
                        type="tel"
                        className={inputBaseClass}
                        value={formValues.clientPhone || ''}
                        onChange={handleChange('clientPhone')}
                        placeholder="809-555-5555"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="clientEmail">
                        Email
                      </label>
                      <input
                        id="clientEmail"
                        type="email"
                        className={inputBaseClass}
                        value={formValues.clientEmail || ''}
                        onChange={handleChange('clientEmail')}
                        placeholder="example@mail.com"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="clientAddress">
                      Address
                    </label>
                    <input
                      id="clientAddress"
                      type="text"
                      className={inputBaseClass}
                      value={formValues.clientAddress || ''}
                      onChange={handleChange('clientAddress')}
                      placeholder="Street, Sector, City"
                      disabled={isSaving}
                    />
                  </div>
                </section>

                <hr className="border-[var(--border-subtle)]" />

                {/* Loan Details Section */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Loan Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="loanDate">
                        Loan Date
                      </label>
                      <input
                        id="loanDate"
                        type="date"
                        className={inputBaseClass}
                        value={formValues.loanDate}
                        onChange={handleChange('loanDate')}
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="frequency">
                        Frequency
                      </label>
                      <select
                        id="frequency"
                        className={inputBaseClass}
                        value={formValues.frequency}
                        onChange={handleChange('frequency')}
                        disabled={isSaving}
                      >
                        {LOAN_FREQUENCIES.map((f) => (
                          <option key={f} value={f} className="capitalize">
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="amount">
                        Amount (RD$)
                      </label>
                      <input
                        id="amount"
                        type="number"
                        className={inputBaseClass}
                        value={formValues.amount || ''}
                        onChange={handleChange('amount')}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="interestRate">
                        Interest %
                      </label>
                      <input
                        id="interestRate"
                        type="number"
                        className={inputBaseClass}
                        value={formValues.interestRate || ''}
                        onChange={handleChange('interestRate')}
                        placeholder="e.g. 5"
                        min="0"
                        step="0.1"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={labelClass} htmlFor="status">
                      Status
                    </label>
                    <select
                      id="status"
                      className={inputBaseClass}
                      value={formValues.status}
                      onChange={handleChange('status')}
                      disabled={isSaving}
                    >
                      {LOAN_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="notes">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      className={inputBaseClass}
                      value={formValues.notes || ''}
                      onChange={handleChange('notes')}
                      placeholder="Additional details..."
                      disabled={isSaving}
                    />
                  </div>
                </section>

                {error && (
                  <div className="rounded-[var(--radius-sm)] bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)]">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Loan'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}