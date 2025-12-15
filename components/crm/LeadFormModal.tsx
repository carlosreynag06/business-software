// components/crm/LeadFormModal.tsx
// Uses server actions to create/update (no client-side inserts). See actions in app/(app)/crm-pipeline/actions.ts. :contentReference[oaicite:0]{index=0}
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import type { Lead, ServiceType, MarketingChannel } from '@/lib/types'
import {
  createLeadWithContact,
  updateLeadAndContact,
} from '@/app/(app)/crm-pipeline/actions'

// --- USER-FRIENDLY LABELS ---
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

interface LeadFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newLead: Lead) => void
  initialData?: Lead | null // For editing
}

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// Minimal DR-friendly phone normalizer → E.164 (+1XXXXXXXXXX)
function normalizeDrPhoneToE164(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  if (digits.length === 10 && /^(809|829|849)/.test(digits)) return `+1${digits}`
  if (raw.trim().startsWith('+') && digits.length >= 11) return `+${digits}`
  return null
}

export default function LeadFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: LeadFormModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = !!initialData
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('website')
  const [sourceChannel, setSourceChannel] = useState<MarketingChannel>('referral')
  const [expectedValue, setExpectedValue] = useState('')
  const [notes, setNotes] = useState('')

  // Pre-fill form if editing
  useEffect(() => {
    if (isOpen && isEditing && initialData) {
      setFullName(initialData.contact?.fullName || '')
      setEmail(initialData.contact?.email || '')
      setPhone(initialData.contact?.phone || '')
      setServiceType(initialData.serviceType)
      setSourceChannel(initialData.sourceChannel)
      setExpectedValue(
        initialData.expectedValue !== undefined && initialData.expectedValue !== null
          ? String(initialData.expectedValue)
          : ''
      )
      setNotes(initialData.notes || '')
    } else if (isOpen && !isEditing) {
      clearForm()
    }
    setErrorMsg(null)
  }, [isOpen, isEditing, initialData])

  const clearForm = () => {
    setFullName('')
    setEmail('')
    setPhone('')
    setServiceType('website')
    setSourceChannel('referral')
    setExpectedValue('')
    setNotes('')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setErrorMsg(null)

    try {
      const normalizedPhone = normalizeDrPhoneToE164(phone)
      const parsedExpected = Number.isFinite(Number(expectedValue))
        ? parseFloat(expectedValue)
        : 0

      if (isEditing) {
        // --- EDIT: go through server action (RLS-safe) ---
        const updated = await updateLeadAndContact({
          id: initialData!.id,
          serviceType,
          sourceChannel,
          expectedValue: parsedExpected || 0,
          notes: notes || null,
          contact: initialData?.contact
            ? {
                id: initialData!.contact!.id,
                fullName,
                email: email || null,
                phone: phone || null,
              }
            : undefined,
        })
        onSave(updated)
      } else {
        // --- CREATE: contact + lead via server action (RLS-safe) ---
        const created = await createLeadWithContact({
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          serviceType,
          sourceChannel,
          expectedValue: parsedExpected || 0,
          notes: notes || null,
        })
        onSave(created)
      }

      if (!isEditing) clearForm()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          aria-labelledby="add-lead-modal-title"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2
                  id="add-lead-modal-title"
                  className="font-sans text-lg font-semibold text-[var(--text-primary)]"
                >
                  {isEditing ? 'Edit Lead' : 'Add New Lead'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                {/* Error */}
                {errorMsg && (
                  <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                    {errorMsg}
                  </div>
                )}

                <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                  Contact Info
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputBaseClass}
                      placeholder="name@email.com"
                      disabled={isSaving}
                    />
                  </div>

                  {/* Phone (DR-first) */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Phone / WhatsApp (DR)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputBaseClass}
                      placeholder="+1 (809) 555-1212"
                      inputMode="tel"
                      aria-describedby="phone-help"
                      disabled={isSaving}
                    />
                    <p id="phone-help" className="mt-1 text-xs text-[var(--text-tertiary)]">
                      Accepts 809/829/849 numbers; saved in +1 E.164 format when possible.
                    </p>
                  </div>
                </div>

                <hr className="border-[var(--border-subtle)]" />

                <h3 className="text-sm font-medium text-[var(--text-secondary)]">
                  Lead Details
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="serviceType"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Service Type
                    </label>
                    <select
                      id="serviceType"
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value as ServiceType)}
                      className={inputBaseClass}
                      disabled={isSaving}
                    >
                      {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="sourceChannel"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Source Channel
                    </label>
                    <select
                      id="sourceChannel"
                      value={sourceChannel}
                      onChange={(e) => setSourceChannel(e.target.value as MarketingChannel)}
                      className={inputBaseClass}
                      disabled={isSaving}
                    >
                      {Object.entries(MARKETING_CHANNEL_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="expectedValue"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Expected Value (RD$)
                    </label>
                    <input
                      type="number"
                      id="expectedValue"
                      value={expectedValue}
                      onChange={(e) => setExpectedValue(e.target.value)}
                      className={inputBaseClass}
                      placeholder="0"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      disabled={isSaving}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="notes"
                      className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]"
                    >
                      Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className={inputBaseClass}
                      disabled={isSaving}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="h-10 rounded-[var(--radius-sm)] border border-[var(--border)] bg-transparent px-4 text-sm font-medium text-[var(--text-secondary)] shadow-sm transition-colors hover:bg-[var(--border-subtle)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-10 w-28 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[var(--primary-600)] disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Save Lead'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
