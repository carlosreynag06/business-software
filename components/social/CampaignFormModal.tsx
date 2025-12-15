// components/social/CampaignFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  SocialMediaCampaign,
  CampaignStatus,
  MarketingChannel,
} from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

// From My Business Software Desgin.pdf
const CHANNEL_RESOURCES = [
  {
    id: 'instagram',
    title: 'Instagram',
  },
  {
    id: 'facebook',
    title: 'Facebook',
  },
  {
    id: 'tiktok',
    title: 'TikTok',
  },
  {
    id: 'youtube',
    title: 'YouTube',
  },
  {
    id: 'google_ads',
    title: 'Google Ads',
  },
  {
    id: 'other',
    title: 'Other',
  },
]

// From My Business Software.pdf
const ALL_CAMPAIGN_STATUSES: CampaignStatus[] = [
  'planning',
  'active',
  'paused',
  'completed',
  'canceled',
]

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface CampaignFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: SocialMediaCampaign | null
  isSaving: boolean
}

export default function CampaignFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: CampaignFormModalProps) {
  const isEditing = !!initialData
  const [formState, setFormState] = useState({
    id: initialData?.id || undefined,
    brandAccount: initialData?.brandAccount || '',
    channels: initialData?.channels || [],
    status: initialData?.status || 'planning',
    budgetTotal: initialData?.budgetTotal || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    goals: initialData?.goals || '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormState({
        id: initialData?.id || undefined,
        brandAccount: initialData?.brandAccount || '',
        channels: initialData?.channels || [],
        status: initialData?.status || 'planning',
        budgetTotal: initialData?.budgetTotal || '',
        startDate: initialData?.startDate || '',
        endDate: initialData?.endDate || '',
        goals: initialData?.goals || '',
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

  const handleChannelChange = (channel: MarketingChannel) => {
    setFormState((prev) => {
      const newChannels = prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel]
      return { ...prev, channels: newChannels }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formState,
      budgetTotal: parseFloat(formState.budgetTotal as string) || 0,
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
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Campaign' : 'Add New Campaign'}
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
                <FormRow label="Brand Account">
                  <input
                    type="text"
                    name="brandAccount"
                    value={formState.brandAccount}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                    disabled={isSaving}
                  />
                </FormRow>

                <FormRow label="Channels">
                  <div className="flex flex-wrap gap-2">
                    {CHANNEL_RESOURCES.map((channel) => (
                      <button
                        type="button"
                        key={channel.id}
                        onClick={() =>
                          handleChannelChange(channel.id as MarketingChannel)
                        }
                        className={clsx(
                          'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors',
                          formState.channels.includes(
                            channel.id as MarketingChannel,
                          )
                            ? 'bg-[var(--primary)] text-white'
                            : 'bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]',
                        )}
                      >
                        {channel.title}
                      </button>
                    ))}
                  </div>
                </FormRow>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="Status">
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    >
                      {ALL_CAMPAIGN_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Budget (RD$)">
                    <input
                      type="number"
                      name="budgetTotal"
                      value={formState.budgetTotal}
                      onChange={handleChange}
                      className={inputBaseClass}
                      placeholder="0.00"
                      step="1000"
                      disabled={isSaving}
                    />
                  </FormRow>
                  <FormRow label="Start Date">
                    <input
                      type="date"
                      name="startDate"
                      value={formState.startDate}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    />
                  </FormRow>
                  <FormRow label="End Date">
                    <input
                      type="date"
                      name="endDate"
                      value={formState.endDate}
                      onChange={handleChange}
                      className={inputBaseClass}
                      disabled={isSaving}
                    />
                  </FormRow>
                </div>
                <FormRow label="Goals (Optional)">
                  <textarea
                    name="goals"
                    value={formState.goals}
                    onChange={handleChange}
                    rows={3}
                    className={inputBaseClass}
                    disabled={isSaving}
                  />
                </FormRow>
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
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Save Campaign'
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