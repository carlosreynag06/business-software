// components/crm/AddLead.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import {
  Lead,
  Contact,
  ServiceType,
  MarketingChannel,
  SERVICE_TYPES,
  MARKETING_CHANNELS,
} from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

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
// --- END LABELS ---

interface AddLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (newLead: Lead) => void
}

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

export default function AddLeadModal({
  isOpen,
  onClose,
  onSave,
}: AddLeadModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('website')
  const [sourceChannel, setSourceChannel] = useState<MarketingChannel>('referral')
  const [expectedValue, setExpectedValue] = useState('')
  const [notes, setNotes] = useState('')

  // Supabase client (browser)
  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    return createClient(url, anon)
  }, [])

  const clearForm = () => {
    setFullName('')
    setEmail('')
    setServiceType('website')
    setSourceChannel('referral')
    setExpectedValue('')
    setNotes('')
    setErrorMsg(null)
  }

  // Clear form when modal opens
  useEffect(() => {
    if (isOpen) clearForm()
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setErrorMsg(null)

    try {
      // 1) Find-or-create Contact (unique per user on (user_id, email))
      let contactRow:
        | {
            id: string
            full_name: string
            email: string | null
            preferred_channel: 'whatsapp' | 'email'
            location_city: string | null
            created_at: string
          }
        | null = null

      if (email) {
        const { data: existing, error: findErr } = await supabase
          .from('contacts')
          .select('id, full_name, email, preferred_channel, location_city, created_at')
          .eq('email', email)
          .maybeSingle()
        if (findErr) throw findErr
        if (existing) contactRow = existing
      }

      if (!contactRow) {
        const { data, error: insertContactErr } = await supabase
          .from('contacts')
          .insert({
            full_name: fullName,
            email: email || null,
            preferred_channel: 'whatsapp', // matches enum contact_preferred_channel
          })
          .select('id, full_name, email, preferred_channel, location_city, created_at')
          .single()
        if (insertContactErr) throw insertContactErr
        contactRow = data
      }

      if (!contactRow) throw new Error('Failed to resolve contact.')

      // 2) Create Lead (current_stage defaults to 'lead'; triggers stamp stage_ts)
      const expectedValNumber = expectedValue ? Number(expectedValue) : 0
      const { data: leadInserted, error: insertLeadErr } = await supabase
        .from('leads')
        .insert({
          contact_id: contactRow.id,
          service_type: serviceType,
          source_channel: sourceChannel,
          expected_value: expectedValNumber,
          notes: notes || null,
        })
        .select(
          'id, contact_id, service_type, source_channel, current_stage, stage_ts, expected_value, notes, created_at'
        )
        .single()
      if (insertLeadErr) throw insertLeadErr

      // 3) Shape to UI Lead
      const createdContact: Contact = {
        id: contactRow.id,
        fullName: contactRow.full_name,
        email: contactRow.email,
        preferredChannel: contactRow.preferred_channel,
        locationCity: contactRow.location_city ?? undefined,
        createdAt: contactRow.created_at,
      }

      const createdLead: Lead = {
        id: leadInserted.id,
        contactId: leadInserted.contact_id,
        serviceType: leadInserted.service_type,
        sourceChannel: leadInserted.source_channel,
        currentStage: leadInserted.current_stage,
        stageTs: (leadInserted.stage_ts ?? {}) as Record<any, string>,
        expectedValue: Number(leadInserted.expected_value ?? 0),
        notes: leadInserted.notes ?? undefined,
        createdAt: leadInserted.created_at,
        contact: createdContact,
      }

      onSave(createdLead)
      clearForm()
      onClose()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save lead')
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
                  Add New Lead
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
                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Contact Info</h3>
                {errorMsg && (
                  <div className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-2 text-sm text-[var(--danger)]">
                    {errorMsg}
                  </div>
                )}
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
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <hr className="border-[var(--border-subtle)]" />

                <h3 className="text-sm font-medium text-[var(--text-secondary)]">Lead Details</h3>
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
                      placeholder="0.00"
                      step="1000"
                      min="0"
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
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Save Lead'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
