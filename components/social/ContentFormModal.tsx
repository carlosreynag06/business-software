// components/social/ContentFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  SocialMediaCampaign,
  ContentCalendarItem,
  MarketingChannel,
  ContentStatus,
} from '@/lib/types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

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

const ALL_CONTENT_STATUSES: ContentStatus[] = [
  'planned',
  'approved',
  'posted',
  'skipped',
]

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface ContentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: ContentCalendarItem | null
  isSaving: boolean
  campaigns: SocialMediaCampaign[]
}

export default function ContentFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
  campaigns,
}: ContentFormModalProps) {
  const isEditing = !!initialData
  const [formState, setFormState] = useState({
    id: initialData?.id || undefined,
    campaignId: initialData?.campaignId || '',
    channel: initialData?.channel || 'instagram',
    publishDatetime: initialData?.publishDatetime
      ? new Date(initialData.publishDatetime).toISOString().slice(0, 16)
      : '',
    caption: initialData?.caption || '',
    status: initialData?.status || 'planned',
    linkToPost: initialData?.linkToPost || '',
  })

  useEffect(() => {
    if (isOpen) {
      setFormState({
        id: initialData?.id || undefined,
        campaignId: initialData?.campaignId || '',
        channel: initialData?.channel || 'instagram',
        publishDatetime: initialData?.publishDatetime
          ? new Date(initialData.publishDatetime).toISOString().slice(0, 16) // Format for datetime-local
          : '',
        caption: initialData?.caption || '',
        status: initialData?.status || 'planned',
        linkToPost: initialData?.linkToPost || '',
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
      // Convert local datetime string back to full ISO for the 'action'
      publishDatetime: formState.publishDatetime
        ? new Date(formState.publishDatetime).toISOString()
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
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
                <h2 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
                  {isEditing ? 'Edit Post' : 'Add New Post'}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="Campaign">
                    <select
                      name="campaignId"
                      value={formState.campaignId}
                      onChange={handleChange}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    >
                      <option value="" disabled>
                        Select a campaign...
                      </option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.brandAccount}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Channel">
                    <select
                      name="channel"
                      value={formState.channel}
                      onChange={handleChange}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    >
                      {CHANNEL_RESOURCES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                </div>
                <FormRow label="Publish Date & Time">
                  <input
                    type="datetime-local"
                    name="publishDatetime"
                    value={formState.publishDatetime}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                    disabled={isSaving}
                  />
                </FormRow>

                <FormRow label="Caption">
                  <textarea
                    name="caption"
                    value={formState.caption}
                    onChange={handleChange}
                    rows={4}
                    className={inputBaseClass}
                    placeholder="Write content..."
                    disabled={isSaving}
                  />
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
                      {ALL_CONTENT_STATUSES.map((s) => (
                        <option key={s} value={s} className="capitalize">
                          {s}
                        </option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Posted Link (Optional)">
                    <input
                      type="url"
                      name="linkToPost"
                      value={formState.linkToPost}
                      onChange={handleChange}
                      className={inputBaseClass}
                      placeholder="https://..."
                      disabled={isSaving}
                    />
                  </FormRow>
                </div>
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
                    'Save Post'
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