'use client'

import React, { useMemo, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'

// Server Actions
import { createPayment, unlinkPayment, updateCase } from '../actions'

import {
  InmigrationCaseUI,
  MilestoneUI,
  PaymentUI,
} from '@/lib/inmigration.types'

import {
  Loader2,
  Edit,
  DollarSign,
  X,
  ClipboardList,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import PaymentFormModal from '@/components/payments/PaymentFormModal'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import type { Project } from '@/lib/types'

/* ------------------------------------------------
    Local helpers (currency & dates)
------------------------------------------------- */
const formatCurrencyRD = (valueInCents: number | undefined | null) => {
  if (valueInCents === undefined || valueInCents === null) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents / 100)
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return 'N/A'
  }
}

const formatDateTime = (isoString?: string | null) => {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return 'N/A'
  }
}

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


/* ------------------------------------------------
    Props
------------------------------------------------- */
interface CaseDetailClientProps {
  initialCase: InmigrationCaseUI
  allPayments: PaymentUI[] // All payments from the server
}

export default function CaseDetailClient({
  initialCase,
  allPayments,
}: CaseDetailClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // Use props directly
  const caseState = initialCase

  // MODIFIED: Filtered out 'consult-done' and 'initial' AND removed duplicate "Consultation" second step
  const shownMilestones = useMemo(() => {
    const mapped = caseState.milestones
      .map((m) => {
        const isConsult =
          m.ms_id === 'consult-sched' ||
          (m.label || '').trim().toLowerCase() === 'consultation scheduled'
        return isConsult ? { ...m, label: 'Consultation' } : m
      })
      .filter((m) => m.ms_id !== 'consult-done' && m.ms_id !== 'initial')

    // Remove a second "Consultation" if present (keep the first)
    const result: MilestoneUI[] = []
    const seen = new Set<string>()
    for (const m of mapped) {
      const key = (m.label || '').trim().toLowerCase()
      if (key === 'consultation') {
        if (seen.has(key)) continue
        seen.add(key)
      }
      result.push(m)
    }
    return result
  }, [caseState.milestones])

  // Derived payments for this case from allPayments prop
  const linkedPayments = useMemo(() => {
    return allPayments.filter((p) =>
      caseState.linked_payment_ids.includes(p.id),
    )
  }, [allPayments, caseState.linked_payment_ids])

  const totalPaidCents = useMemo(
    () => linkedPayments.reduce((acc, p) => acc + p.amount_dop_cents, 0),
    [linkedPayments],
  )

  const balanceDopCents = useMemo(
    () => caseState.costDopCents - totalPaidCents,
    [caseState.costDopCents, totalPaidCents],
  )

  // Local UI state only
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentToUnlink, setPaymentToUnlink] = useState<PaymentUI | null>(null)
  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)

 // Shape for PaymentFormModal (expects "Project")
  const caseAsProject: Project = useMemo(
    () => ({
      id: caseState.id,
      name: caseState.service,
      clientName: caseState.clientName,
      type: 'website', // Placeholder, as PaymentFormModal might not use it
      budgetDopCents: balanceDopCents > 0 ? balanceDopCents : 0,
      amountPaidDopCents: totalPaidCents,
      startDate: null,
      dueDate: null,
    }),
    [caseState, balanceDopCents, totalPaidCents],
  )

  const paymentInitialData = useMemo(
    () => ({
      caseId: caseState.id, // MODIFIED
      amountDopCents: balanceDopCents > 0 ? balanceDopCents : 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseState.id, balanceDopCents],
  )
  /* ------------------------------------------------
     Payments — persist via server actions
    ------------------------------------------------- */
  const handleSavePayment = (formData: any) => {
    startTransition(async () => {
      const paymentData = {
        date: formData.dateReceived,
        method:
          formData.method === 'cash'
            ? 'Cash'
            : formData.method === 'card'
            ? 'Card'
            : formData.method === 'transfer'
            ? 'Transfer'
            : 'Cash', // Default to 'Cash'
        amount_dop_cents: formData.amountDopCents,
        notes: formData.memo,
        tags: [
          formData.memo?.toLowerCase?.().includes('gov')
            ? "Gov't fee"
            : 'Service fee',
        ],
        case_id: caseState.id,
      }

      const result = await createPayment(paymentData)

      if (result?.error) {
        notify({
          title: 'Error Saving Payment',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({
          title: 'Payment Recorded',
          description: `Payment of ${formatCurrencyRD(
            formData.amountDopCents,
          )} recorded for ${caseState.clientName}.`,
          variant: 'success',
        })
        setIsPaymentModalOpen(false)
      }
    })
  }

  const handleUnlinkPayment = () => {
    if (!paymentToUnlink) return
    startTransition(async () => {
      const result = await unlinkPayment(paymentToUnlink.id)

      if (result?.error) {
        notify({
          title: 'Error Unlinking Payment',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({ title: 'Payment Unlinked', variant: 'success' })
        setPaymentToUnlink(null)
      }
    })
  }

  /* ------------------------------------------------
     Milestone toggle/undo with cleanup (server)
    ------------------------------------------------- */
  const handleSetMilestone = (clicked_ms_id: string) => {
    startTransition(async () => {
      const ms = caseState.milestones
      const i = ms.findIndex((m) => m.ms_id === clicked_ms_id)
      const c = ms.findIndex((m) => m.ms_id === caseState.currentMilestoneId)
      if (i === -1) return

      const clickedLabel = ms[i]?.label ?? clicked_ms_id
      let logText: string | undefined = undefined

      let nextMilestones: MilestoneUI[] = ms.map((m) => ({ ...m }))
      let nextCurrent_ms_id = caseState.currentMilestoneId

      if (c === -1 || i > c) {
        // Forward: mark steps <= i completed
        nextMilestones = ms.map((m, idx) => ({
          ...m,
          completed: idx <= i ? true : m.completed,
        }))
        nextCurrent_ms_id = ms[i].ms_id
        logText = `Milestone changed to: ${clickedLabel}`
      } else if (i === c) {
        // Same: undo -> set current to i-1 (or keep first if i is 0); unmark steps >= i
        const newIndex = Math.max(i - 1, 0)
        nextCurrent_ms_id = ms[newIndex].ms_id
        nextMilestones = ms.map((m, idx) => ({
          ...m,
          completed: idx < i ? m.completed : false,
        }))
      } else {
        // Backward (i < c): set current to clicked, unmark steps > i
        nextCurrent_ms_id = ms[i].ms_id
        nextMilestones = ms.map((m, idx) => ({
          ...m,
          completed: idx > i ? false : m.completed || idx <= i,
        }))
        logText = `Milestone changed to: ${clickedLabel}`
      }

      const result = await updateCase(
        caseState.id,
        { current_milestone_id: nextCurrent_ms_id },
        nextMilestones,
        logText,
      )

      if (result?.error) {
        notify({
          title: 'Error Updating Milestone',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({ title: 'Milestone Updated', variant: 'info' })
      }
    })
  }

  /* ------------------------------------------------
     Notes — persist via server action
    ------------------------------------------------- */
  const handleSaveNotes = (newNotes: string) => {
    startTransition(async () => {
      const result = await updateCase(
        caseState.id,
        { notes: newNotes },
        undefined,
        'Notes updated.',
      )

      if (result?.error) {
        notify({
          title: 'Error Saving Notes',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({ title: 'Notes Saved', variant: 'success' })
      }
    })
  }

  /* ------------------------------------------------
     Case Edit — persist via server action
    ------------------------------------------------- */
  const handleSaveCase = (formData: InmigrationCaseUI) => {
    startTransition(async () => {
      const contactChanged =
        (formData.clientEmail ?? '') !== (caseState.clientEmail ?? '') ||
        (formData.clientPhone ?? '') !== (caseState.clientPhone ?? '') ||
        (formData.clientAddress ?? '') !== (caseState.clientAddress ?? '')

      const idChanged =
        (formData.caseNumber ?? '') !== (caseState.caseNumber ?? '') ||
        (formData.passportNumber ?? '') !== (caseState.passportNumber ?? '') ||
        (formData.dsConfirmation ?? '') !== (caseState.dsConfirmation ?? '')

      let logText: string | undefined = undefined
      if (contactChanged && idChanged) {
        logText = 'Client contact and case identifiers updated.'
      } else if (contactChanged) {
        logText = 'Client contact updated.'
      } else if (idChanged) {
        logText = 'Case identifiers updated.'
      }

      // Patch only the edited fields (DB snake_case)
      const patch = {
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        client_phone: formData.clientPhone,
        client_address: formData.clientAddress,
        case_number: formData.caseNumber,
        passport_number: formData.passportNumber,
        ds_confirmation: formData.dsConfirmation,
      }

      const result = await updateCase(caseState.id, patch, undefined, logText)

      if (result?.error) {
        notify({
          title: 'Error Updating Case',
          description: result.error,
          variant: 'danger',
        })
      } else {
        notify({ title: 'Case Updated', variant: 'success' })
        setIsCaseModalOpen(false)
      }
    })
  }

  return (
    <>
      <div className="flex h-full flex-col gap-6">
        {/* 1. Header (name + case type only) */}
        <CaseHeader
          caseItem={caseState}
          onRecordPayment={() => setIsPaymentModalOpen(true)}
          onEditCase={() => setIsCaseModalOpen(true)}
        />

        {/* 2. Progress Stepper */}
        <ProgressStepper
          milestones={shownMilestones}
          currentMilestoneId={caseState.currentMilestoneId}
          onSetMilestone={handleSetMilestone}
        />

        {/* 3. Main Content Grid */}
        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info card */}
            <ClientInfoPanel
              caseItem={caseState}
              onEdit={() => setIsCaseModalOpen(true)}
            />

            {/* Payments */}
            <PaymentsPanel
              linkedPayments={linkedPayments}
              balanceDopCents={balanceDopCents}
              onRecordPayment={() => setIsPaymentModalOpen(true)}
              onUnlinkPayment={(p) => setPaymentToUnlink(p)}
            />
            <NotesPanel
              initialContent={caseState.notes}
              onSaveNotes={handleSaveNotes}
            />
          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-1">
            <ActivityTimeline activities={caseState.activity} />
          </div>
        </div>
      </div>

      {/* 4. Modals */}
      <InmigrationCaseFormModal
        isOpen={isCaseModalOpen}
        onClose={() => setIsCaseModalOpen(false)}
        onSave={handleSaveCase}
        initialData={caseState}
        isSaving={isPending}
      />

      <ConfirmDialog
        isOpen={!!paymentToUnlink}
        onClose={() => setPaymentToUnlink(null)}
        onConfirm={handleUnlinkPayment}
        title="Unlink Payment"
      >
        Are you sure you want to unlink this payment of{' '}
        <strong>{formatCurrencyRD(paymentToUnlink?.amount_dop_cents)}</strong>?
      </ConfirmDialog>

      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        initialData={paymentInitialData}
        isSaving={isPending}
        leads={[]}
        students={[]}
        projects={[]} 
        inmigrationCases={[initialCase]} 
      />
    </>
  )
}

/* ------------------------------------------------
    Sub-Components
------------------------------------------------- */
interface CaseHeaderProps {
  caseItem: InmigrationCaseUI
  onRecordPayment: () => void
  onEditCase: () => void
}

function CaseHeader({ caseItem, onRecordPayment, onEditCase }: CaseHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
          {caseItem.clientName}
        </h1>
        <p className="mt-1 text-base text-[var(--text-secondary)]">
          {caseItem.service}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRecordPayment}>
          <DollarSign size={16} className="mr-2" />
          Record Payment
        </Button>
        <Button variant="outline" size="icon" onClick={onEditCase}>
          <Edit size={16} />
        </Button>
      </div>
    </div>
  )
}

interface ProgressStepperProps {
  milestones: MilestoneUI[]
  currentMilestoneId: string // ms_id (e.g., 'ds160')
  onSetMilestone: (ms_id: string) => void
}

// No horizontal scrollbar; connectors now a solid continuous line
function ProgressStepper({
  milestones,
  currentMilestoneId,
  onSetMilestone,
}: ProgressStepperProps) {
  const currentIndex = milestones.findIndex(
    (m) => m.ms_id === currentMilestoneId,
  )
  const completedRatio =
    milestones.length > 1 && currentIndex >= 0
      ? currentIndex / (milestones.length - 1)
      : 0

  return (
    <div className="w-full py-2">
      <div className="relative">
        {/* Base line (neutral) */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--border)]" />
        {/* Completed portion */}
        <div
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--primary)]"
          style={{ width: `${completedRatio * 100}%` }}
        />
        <nav
          className="relative z-10 flex items-center justify-between w-full"
          aria-label="Progress"
        >
          {milestones.map((milestone, index) => {
            const isCompleted = index < currentIndex
            const isCurrent = milestone.ms_id === currentMilestoneId

            return (
              <button
                key={milestone.id}
                onClick={() => onSetMilestone(milestone.ms_id)}
                className="flex flex-col items-center px-3 py-2"
              >
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    isCompleted
                      ? 'bg-[var(--primary)] text-white'
                      : isCurrent
                      ? 'border-2 border-[var(--primary)] bg-[var(--primary-050)] text-[var(--primary)]'
                      : 'border-2 border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-secondary)]',
                  )}
                >
                  {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={clsx(
                    'mt-2 text-center text-xs font-medium',
                    isCurrent
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--text-secondary)]',
                  )}
                >
                  {milestone.label}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

interface PaymentsPanelProps {
  linkedPayments: PaymentUI[]
  balanceDopCents?: number | null
  onRecordPayment: () => void
  onUnlinkPayment: (payment: PaymentUI) => void
}

function PaymentsPanel({
  linkedPayments,
  balanceDopCents,
  onRecordPayment,
  onUnlinkPayment,
}: PaymentsPanelProps) {
  const hasBalance = Number(balanceDopCents || 0) > 0

  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <div className="border-b border-[var(--border-subtle)] p-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Payments
        </h3>
        <div className="text-right">
          <div
            className={clsx(
              'font-semibold',
              hasBalance ? 'text-[var(--warning)]' : 'text-[var(--success)]',
            )}
          >
            {hasBalance
              ? `${formatCurrencyRD(balanceDopCents)} Due`
              : 'Paid in Full'}
          </div>
          <div className="text-xs text-[var(--text-secondary)]">Balance</div>
        </div>
      </div>
      <div className="p-5 space-y-2">
        {linkedPayments.length === 0 && (
          <p className="text-sm text-center text-[var(--text-tertiary)] py-4">
            No payments linked to this case.
          </p>
        )}
        {linkedPayments.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-2 rounded bg-[var(--bg-muted)] p-3"
          >
            <div>
              <span className="font-medium text-[var(--text-primary)]">
                {formatCurrencyRD(p.amount_dop_cents)}
              </span>
              <span className="ml-2 text-xs text-[var(--text-secondary)]">
                ({formatDate(p.date)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                {p.tags.join(', ')}
              </span>
              <button
                onClick={() => onUnlinkPayment(p)}
                className="text-[var(--text-secondary)] hover:text-[var(--danger)]"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--border-subtle)] p-5">
        <Button variant="outline" className="w-full" onClick={onRecordPayment}>
          <DollarSign size={16} className="mr-2" />
          Record Payment
        </Button>
      </div>
    </div>
  )
}

function NotesPanel({
  initialContent,
  onSaveNotes,
}: {
  initialContent?: string | null
  onSaveNotes: (newContent: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(initialContent || '')

  const handleSave = () => {
    startTransition(() => onSaveNotes(notes))
  }

  React.useEffect(() => {
    setNotes(initialContent || '')
  }, [initialContent])

  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <h3 className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold text-[var(--text-primary)]">
        Case Notes
      </h3>
      <div className="p-5">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={6}
          className={clsx(inputBaseClass, 'w-full')}
          placeholder="Add notes about 221(g) requirements, client communications, etc."
        />
      </div>
      <div className="border-t border-[var(--border-subtle)] p-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
          Save Notes
        </Button>
      </div>
    </div>
  )
}

function ActivityTimeline({
  activities,
}: {
  activities: { at: string; text: string }[]
}) {
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <h3 className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold text-[var(--text-primary)]">
        Activity Timeline
      </h3>
      <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
        {activities.length === 0 && (
          <p className="text-sm text-center text-[var(--text-tertiary)] py-4">
            No activity recorded.
          </p>
        )}
        {activities.map((item, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)]">
              <ClipboardList size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {item.text}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatDateTime(item.at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------
    Client Info card
------------------------------------------------- */
function ClientInfoPanel({
  caseItem,
  onEdit,
}: {
  caseItem: InmigrationCaseUI
  onEdit: () => void
}) {
  const safe = (v?: string | null) => (v && v.trim() ? v : '—')

  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Client Info
        </h3>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit size={14} className="mr-2" />
          Edit
        </Button>
      </div>
      <div className="p-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoRow label="Name" value={safe(caseItem.clientName)} />
        <InfoRow label="Phone" value={safe(caseItem.clientPhone)} />
        <InfoRow label="Email" value={safe(caseItem.clientEmail)} />
        <InfoRow label="Address" value={safe(caseItem.clientAddress)} />
        <InfoRow label="Case Number" value={safe(caseItem.caseNumber)} />
        <InfoRow label="Passport Number" value={safe(caseItem.passportNumber)} />
        <InfoRow
          label="DS-160/260 Confirmation"
          value={safe(caseItem.dsConfirmation)}
        />
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

/* ------------------------------------------------
    EditCase Modal
------------------------------------------------- */
interface CaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: InmigrationCaseUI) => void
  initialData: InmigrationCaseUI | null
  isSaving: boolean
}

function InmigrationCaseFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
}: CaseFormModalProps) {
  const isEditing = !!initialData
  const [formState, setFormState] = useState<Partial<InmigrationCaseUI>>({})

  React.useEffect(() => {
    if (isOpen) setFormState(initialData || {})
  }, [isOpen, initialData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formState as InmigrationCaseUI)
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
                  {isEditing ? 'Edit Case' : 'Add New Case'}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X size={20} />
                </Button>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
                <FormRow label="Client Name">
                  <input
                    type="text"
                    name="clientName"
                    value={formState.clientName || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                    required
                  />
                </FormRow>

                {/* Contact inputs */}
                <FormRow label="Phone">
                  <input
                    type="text"
                    name="clientPhone"
                    value={formState.clientPhone || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                    placeholder="+1 809-555-1234"
                  />
                </FormRow>
                <FormRow label="Email">
                  <input
                    type="email"
                    name="clientEmail"
                    value={formState.clientEmail || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                    placeholder="name@example.com"
                  />
                </FormRow>
                <FormRow label="Address">
                  <input
                    type="text"
                    name="clientAddress"
                    value={formState.clientAddress || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                    placeholder="Street, City, Province"
                  />
                </FormRow>

                {/* Optional identifiers */}
                <FormRow label="Case Number (Optional)">
                  <input
                    type="text"
                    name="caseNumber"
                    value={formState.caseNumber || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                  />
                </FormRow>
                <FormRow label="Passport Number (Optional)">
                  <input
                    type="text"
                    name="passportNumber"
                    value={formState.passportNumber || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
                  />
                </FormRow>
                <FormRow label="DS-160/260 Confirmation (Optional)">
                  <input
                    type="text"
                    name="dsConfirmation"
                    value={formState.dsConfirmation || ''}
                    onChange={handleChange}
                    className={inputBaseClass}
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
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    'Save Changes'
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