// components/real-estate/RealEstateForm.tsx

'use client'

import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  RealEstateDeal,
  RealEstateFormValues,
  RealEstateClientType,
  RealEstateStatus,
} from '@/lib/real-estate.types'

interface RealEstateFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: RealEstateFormValues) => void
  initialValues: RealEstateDeal | null
  isSubmitting: boolean
}

// Re-use same input styling used in RealEstateClient filters
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

const labelClass =
  'text-xs font-medium text-[var(--text-secondary)] mb-1 inline-block'

const selectClass = clsx(inputBaseClass, 'pr-8')

const defaultFormValues: RealEstateFormValues = {
  id: undefined,
  clientName: '',
  clientPhone: '',
  clientEmail: '',
  clientType: 'buyer',
  date: '',
  propertyAddress: '',
  propertyValue: 0,
  commissionPercent: 0,
  status: 'active',
  notes: '',
}

export default function RealEstateForm({
  open,
  onClose,
  onSubmit,
  initialValues,
  isSubmitting,
}: RealEstateFormProps) {
  const [formValues, setFormValues] = useState<RealEstateFormValues>(
    defaultFormValues,
  )
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!initialValues

  // Sync external initialValues into local form state
  useEffect(() => {
    if (initialValues) {
      setFormValues({
        id: initialValues.id,
        clientName: initialValues.clientName ?? '',
        clientPhone: initialValues.clientPhone ?? '',
        clientEmail: initialValues.clientEmail ?? '',
        clientType: initialValues.clientType,
        date: initialValues.date ?? '',
        propertyAddress: initialValues.propertyAddress ?? '',
        propertyValue: initialValues.propertyValue ?? 0,
        commissionPercent: initialValues.commissionPercent ?? 0,
        status: initialValues.status,
        notes: initialValues.notes ?? '',
      })
    } else {
      setFormValues(defaultFormValues)
    }
    setError(null)
  }, [initialValues, open])

  if (!open) return null

  const handleChange =
    (field: keyof RealEstateFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value
      setFormValues((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormValues((prev) => ({
      ...prev,
      clientType: e.target.value as RealEstateClientType,
    }))
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormValues((prev) => ({
      ...prev,
      status: e.target.value as RealEstateStatus,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formValues.clientName.trim()) {
      setError('Client name is required.')
      return
    }
    if (!formValues.propertyAddress.trim()) {
      setError('Property address is required.')
      return
    }
    if (!formValues.date) {
      setError('Date is required.')
      return
    }

    const propertyValueParsed = Number(formValues.propertyValue)
    const commissionParsed = Number(formValues.commissionPercent)

    if (Number.isNaN(propertyValueParsed) || propertyValueParsed < 0) {
      setError('Property value must be a valid non-negative number.')
      return
    }
    if (Number.isNaN(commissionParsed) || commissionParsed < 0) {
      setError('Commission % must be a valid non-negative number.')
      return
    }

    const payload: RealEstateFormValues = {
      ...formValues,
      clientName: formValues.clientName.trim(),
      propertyAddress: formValues.propertyAddress.trim(),
      date: formValues.date,
      propertyValue: propertyValueParsed,
      commissionPercent: commissionParsed,
      notes: formValues.notes?.trim() || '',
      clientPhone: formValues.clientPhone || null,
      clientEmail: formValues.clientEmail || null,
    }

    onSubmit(payload)
  }

  const handleOverlayClick = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const handleInnerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
      aria-modal="true"
      role="dialog"
      aria-labelledby="real-estate-form-title"
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-xl)] bg-[var(--bg-surface)] shadow-[var(--shadow-2)]"
        onClick={handleInnerClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2
              id="real-estate-form-title"
              className="text-lg font-semibold text-[var(--text-primary)]"
            >
              {isEditing ? 'Edit real estate client' : 'Add real estate client'}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Fill in the client and property details. All fields update the
              table and details view.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Close form"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={16} />
          </Button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Client info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="clientName">
                Client name
              </label>
              <input
                id="clientName"
                type="text"
                className={inputBaseClass}
                value={formValues.clientName}
                onChange={handleChange('clientName')}
                autoComplete="name"
              />
            </div>

            <div>
              <label className={labelClass} htmlFor="clientPhone">
                Phone
              </label>
              <input
                id="clientPhone"
                type="tel"
                className={inputBaseClass}
                value={formValues.clientPhone ?? ''}
                onChange={handleChange('clientPhone')}
                autoComplete="tel"
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
                value={formValues.clientEmail ?? ''}
                onChange={handleChange('clientEmail')}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Type / Status / Date */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="clientType">
                Type
              </label>
              <select
                id="clientType"
                className={selectClass}
                value={formValues.clientType}
                onChange={handleTypeChange}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="status">
                Status
              </label>
              <select
                id="status"
                className={selectClass}
                value={formValues.status}
                onChange={handleStatusChange}
              >
                <option value="active">Active</option>
                <option value="sold">Sold</option>
              </select>
            </div>

            <div>
              <label className={labelClass} htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                className={inputBaseClass}
                value={formValues.date}
                onChange={handleChange('date')}
              />
            </div>
          </div>

          {/* Property fields */}
          <div className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="propertyAddress">
                Property address
              </label>
              <input
                id="propertyAddress"
                type="text"
                className={inputBaseClass}
                value={formValues.propertyAddress}
                onChange={handleChange('propertyAddress')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="propertyValue">
                  Property value
                </label>
                <input
                  id="propertyValue"
                  type="number"
                  min={0}
                  className={inputBaseClass}
                  value={
                    formValues.propertyValue === 0
                      ? ''
                      : String(formValues.propertyValue)
                  }
                  onChange={handleChange('propertyValue')}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="commissionPercent">
                  Commission %
                </label>
                <input
                  id="commissionPercent"
                  type="number"
                  min={0}
                  step="0.1"
                  className={inputBaseClass}
                  value={
                    formValues.commissionPercent === 0
                      ? ''
                      : String(formValues.commissionPercent)
                  }
                  onChange={handleChange('commissionPercent')}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass} htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              className={clsx(inputBaseClass, 'resize-none')}
              value={formValues.notes ?? ''}
              onChange={handleChange('notes')}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-600 mt-1" role="alert">
              {error}
            </p>
          )}

          {/* Footer buttons */}
          <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditing
                  ? 'Saving...'
                  : 'Creating...'
                : isEditing
                ? 'Save changes'
                : 'Create client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
