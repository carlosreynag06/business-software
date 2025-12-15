// components/marketing/MarketingFormModal.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  MarketingTouch,
  Lead,
  Contact,
  MarketingChannel,
  TouchType,
} from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

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

const TOUCH_TYPE_LABELS: Record<TouchType, string> = {
  impression: 'Impression',
  click: 'Click',
  form: 'Form',
  call: 'Call',
  qr: 'QR Scan',
  visit: 'Visit',
}

// Re-usable input class from design system
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/*
|--------------------------------------------------------------------------
| Add/Edit Modal Sub-Component
|--------------------------------------------------------------------------
*/
interface MarketingTouchFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: MarketingTouch | null
  isSaving: boolean
  leads: Lead[]
  contacts: Contact[]
}

export default function MarketingFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
  leads,
  contacts,
}: MarketingTouchFormModalProps) {
  const isEditing = !!initialData

  // Create a map of contactId -> fullName
  const contactMap = useMemo(() => new Map(contacts.map(c => [c.id, c.fullName])), [contacts]);

  // Create a list of potential contacts to link to, including those not yet leads
  const linkableContacts = useMemo(() => {
     const leadContactIds = new Set(leads.map(l => l.contactId));
     const nonLeadContacts = contacts.filter(c => !leadContactIds.has(c.id));
     
     const leadOptions = leads.map(l => ({
       id: l.contactId,
       name: `${l.contact?.fullName || contactMap.get(l.contactId) || 'Unknown'} (Lead)`
     }));
     
     const contactOptions = nonLeadContacts.map(c => ({
       id: c.id,
       name: `${c.fullName} (Contact Only)`
     }));
     
     return [...leadOptions, ...contactOptions].sort((a,b) => a.name.localeCompare(b.name));

  }, [leads, contacts, contactMap]);

  const [formState, setFormState] = useState({
    id: initialData?.id || undefined,
    contactId: initialData?.contactId || '',
    channel: initialData?.channel || 'instagram',
    touchType: initialData?.touchType || 'impression',
    timestamp: initialData?.timestamp
      ? new Date(initialData.timestamp).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16),
    utmSource: initialData?.utmSource || '',
    utmCampaign: initialData?.utmCampaign || '',
    cost: initialData?.cost || '',
  })

  useEffect(() => {
    if (isOpen) {
      const now = new Date().toISOString().slice(0, 16);
      setFormState({
        id: initialData?.id || undefined,
        contactId: initialData?.contactId || '',
        channel: initialData?.channel || 'instagram',
        touchType: initialData?.touchType || 'impression',
        timestamp: initialData?.timestamp
          ? new Date(initialData.timestamp).toISOString().slice(0, 16)
          : now,
        utmSource: initialData?.utmSource || '',
        utmCampaign: initialData?.utmCampaign || '',
        cost: initialData?.cost.toString() || '',
      })
    }
  }, [isOpen, initialData])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formState,
      cost: parseFloat(formState.cost as string) || 0,
      // Convert local datetime string back to full ISO
      timestamp: formState.timestamp
        ? new Date(formState.timestamp).toISOString()
        : new Date().toISOString(),
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
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
          >
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Touchpoint' : 'Add New Touchpoint'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                <FormRow label="Contact">
                  <select
                    name="contactId"
                    value={formState.contactId}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                    disabled={isSaving}
                  >
                    <option value="" disabled>
                      Select a contact...
                    </option>
                    {linkableContacts.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </FormRow>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="Channel">
                    <select
                      name="channel"
                      value={formState.channel}
                      onChange={handleChange}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    >
                      {ALL_CHANNELS.map((c) => (
                        <option key={c} value={c} className="capitalize">
                          {MARKETING_CHANNEL_LABELS[c] || c}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Touch Type">
                     <select
                      name="touchType"
                      value={formState.touchType}
                      onChange={handleChange}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    >
                      {ALL_TOUCH_TYPES.map((t) => (
                        <option key={t} value={t} className="capitalize">
                          {TOUCH_TYPE_LABELS[t] || t}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                </div>

                <FormRow label="Timestamp">
                  <input
                    type="datetime-local"
                    name="timestamp"
                    value={formState.timestamp}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                    disabled={isSaving}
                  />
                </FormRow>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="UTM Source (Optional)">
                    <input
                      type="text"
                      name="utmSource"
                      value={formState.utmSource}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    />
                  </FormRow>
                  <FormRow label="UTM Campaign (Optional)">
                    <input
                      type="text"
                      name="utmCampaign"
                      value={formState.utmCampaign}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    />
                  </FormRow>
                </div>
                 
                <FormRow label="Cost (RD$)">
                  <input
                    type="number"
                    name="cost"
                    value={formState.cost}
                    onChange={handleChange}
                    className={inputBaseClass}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    disabled={isSaving}
                  />
                </FormRow>
              </div>

              {/* Footer */}
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
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Save Touchpoint'
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

/*
|--------------------------------------------------------------------------
| Re-usable FormRow
|--------------------------------------------------------------------------
*/
function FormRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {children}
    </div>
  )
}