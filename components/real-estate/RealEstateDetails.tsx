// components/real-estate/Details.tsx

import React from 'react'
import { X, Mail, Phone, MapPin, DollarSign, Percent } from 'lucide-react'
import type { RealEstateDeal } from '@/lib/real-estate.types'
import { Button } from '@/components/ui/Button'

interface RealEstateDetailsProps {
  open: boolean
  onClose: () => void
  deal: RealEstateDeal | null
}

export default function RealEstateDetails({
  open,
  onClose,
  deal,
}: RealEstateDetailsProps) {
  if (!open || !deal) return null

  const {
    clientName,
    clientPhone,
    clientEmail,
    clientType,
    date,
    propertyAddress,
    propertyValue,
    commissionPercent,
    status,
    notes,
  } = deal

  const typeLabel = clientType === 'buyer' ? 'Buyer' : 'Seller'
  const isBuyer = clientType === 'buyer'
  const isSold = status === 'sold'
  const statusLabel = isSold ? 'Sold' : 'Active'

  const formattedValue = Number.isFinite(propertyValue)
    ? propertyValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '—'

  const typeBadgeClass = isBuyer
    ? // Buyer = cool primary accent
      'inline-flex items-center gap-1 rounded-full bg-[var(--primary-050)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-700)]'
    : // Seller = warm warning accent
      'inline-flex items-center gap-1 rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--warning)]'

  const statusBadgeClass = isSold
    ? // Sold = solid success badge
      'inline-flex items-center gap-1 rounded-full bg-[var(--success)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white'
    : // Active = soft primary pill
      'inline-flex items-center gap-1 rounded-full bg-[var(--primary-050)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--primary-700)]'

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/40 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="real-estate-details-title"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full max-w-lg overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-page)] shadow-[var(--shadow-3)] sm:rounded-l-[var(--radius-2xl)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with subtle gradient band */}
        <div className="relative border-b border-[var(--border-subtle)] bg-[var(--grad-malecon-mist)] px-6 py-5">
          <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-soft-light" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Real Estate Deal
              </p>
              <h2
                id="real-estate-details-title"
                className="mt-1 truncate text-xl font-semibold text-[var(--text-primary)]"
              >
                {clientName}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={typeBadgeClass}>{typeLabel}</span>
                <span className={statusBadgeClass}>{statusLabel}</span>
                {date && (
                  <span className="inline-flex items-center rounded-full bg-[var(--surface-elev-2)] px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-[var(--text-tertiary)]">
                    {date}
                  </span>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Close details"
              onClick={onClose}
              className="shrink-0 rounded-full"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Highlight strip with value + commission */}
          <div className="mt-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-4 py-3 shadow-[var(--shadow-1)] sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Property value
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                {formattedValue}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Commission %
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
                {commissionPercent ?? '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 px-6 py-5 text-sm">
          {/* Contact info */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Contact info
              </h3>
            </div>

            <div className="space-y-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
              {clientPhone && (
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-050)]">
                    <Phone size={14} className="text-[var(--primary-700)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                      Phone
                    </p>
                    <p className="truncate text-[var(--text-primary)]">
                      {clientPhone}
                    </p>
                  </div>
                </div>
              )}
              {clientEmail && (
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-050)]">
                    <Mail size={14} className="text-[var(--primary-700)]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                      Email
                    </p>
                    <p className="truncate text-[var(--text-primary)]">
                      {clientEmail}
                    </p>
                  </div>
                </div>
              )}
              {!clientPhone && !clientEmail && (
                <p className="text-xs text-[var(--text-tertiary)]">
                  No contact details saved.
                </p>
              )}
            </div>
          </section>

          {/* Property info */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Property details
              </h3>
            </div>

            <div className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-muted)]">
                  <MapPin size={14} className="text-[var(--text-tertiary)]" />
                </span>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                    Address
                  </p>
                  <p className="mt-0.5 text-[var(--text-primary)]">
                    {propertyAddress || 'No address provided'}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary-050)]">
                    <DollarSign
                      size={14}
                      className="text-[var(--primary-700)]"
                    />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                      Property value
                    </p>
                    <p className="mt-0.5 font-medium text-[var(--text-primary)]">
                      {formattedValue}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--bg-muted)]">
                    <Percent
                      size={14}
                      className="text-[var(--text-tertiary)]"
                    />
                  </span>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                      Commission %
                    </p>
                    <p className="mt-0.5 font-medium text-[var(--text-primary)]">
                      {commissionPercent ?? '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inline summary chips */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={typeBadgeClass}>{typeLabel}</span>
                <span className={statusBadgeClass}>{statusLabel}</span>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="space-y-3 pb-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Notes
              </h3>
            </div>
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
              {notes ? (
                <p className="whitespace-pre-wrap text-[var(--text-primary)]">
                  {notes}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-tertiary)]">
                  No notes added for this client yet.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
