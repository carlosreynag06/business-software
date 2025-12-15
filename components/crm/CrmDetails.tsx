// components/crm/CrmDetails.tsx
'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Layers,
  MessageSquare,
  Tag,
  Globe,
} from 'lucide-react'
import type { Lead } from '@/lib/types'

// --- Helpers ---
const formatCurrencyRD = (value?: number | null) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0)

const formatDate = (iso?: string | null) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Map service types to readable labels
const SERVICE_LABELS: Record<string, string> = {
  website: 'Website Development',
  software: 'Custom Software',
  english_class: 'English Class',
  spanish_class: 'Spanish Class',
  visa: 'Visa Assistance',
  social_media: 'Social Media Mgmt',
}

// Map source channels to readable labels
const SOURCE_LABELS: Record<string, string> = {
  organic: 'Organic Search',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google_ads: 'Google Ads',
  referral: 'Referral',
  other: 'Other',
}

interface CrmDetailsProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
}

export default function CrmDetails({
  isOpen,
  onClose,
  lead,
}: CrmDetailsProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && lead && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-[var(--surface-elev-1)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-5">
              <div>
                <h2 className="font-sans text-xl font-bold text-[var(--text-primary)]">
                  Lead Details
                </h2>
                <p className="text-sm text-[var(--text-tertiary)]">
                  ID: {lead.id.slice(0, 8)}...
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Client Header Card */}
              <div className="mb-6 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-1)] border border-[var(--border-subtle)]">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-sans text-lg font-bold text-[var(--text-primary)]">
                    {lead.contact?.fullName || 'Unknown Name'}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]">
                    {SERVICE_LABELS[lead.serviceType] || lead.serviceType}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                   <div className="flex items-center gap-2">
                     <Calendar size={14} className="text-[var(--text-tertiary)]" />
                     <span>Created on {formatDate(lead.createdAt)}</span>
                   </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <Globe size={14} /> Contact Information
                </h4>
                <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                  <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-4 last:border-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      <Phone size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">
                        Phone
                      </p>
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {lead.contact?.phone || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] p-4 last:border-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      <Mail size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">
                        Email
                      </p>
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {lead.contact?.email || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Optional Location (if it exists in your data schema in future) */}
                  {/* <div className="flex items-center gap-3 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      <MapPin size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-[var(--text-tertiary)]">Location</p>
                      <p className="text-sm font-medium text-[var(--text-primary)]">Santo Domingo</p>
                    </div>
                  </div> 
                  */}
                </div>
              </div>

              {/* Deal Details */}
              <div className="mb-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <Layers size={14} /> Deal Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[var(--text-tertiary)]">
                      <DollarSign size={14} />
                      <span className="text-xs font-medium">Expected Value</span>
                    </div>
                    <p className="font-sans text-lg font-bold text-[var(--text-primary)]">
                      {formatCurrencyRD(lead.expectedValue)}
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[var(--text-tertiary)]">
                      <Tag size={14} />
                      <span className="text-xs font-medium">Source</span>
                    </div>
                    <p className="font-medium text-[var(--text-primary)]">
                      {SOURCE_LABELS[lead.sourceChannel] || lead.sourceChannel}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  <MessageSquare size={14} /> Notes
                </h4>
                <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {lead.notes ? (
                    lead.notes
                  ) : (
                    <span className="italic text-[var(--text-tertiary)]">
                      No notes available for this lead.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions (Optional - can be added later) */}
            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
              <button
                onClick={onClose}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elev-1)] py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-surface)]"
              >
                Close Details
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}