// components/inmigration/InmigrationShared.tsx
'use client'

import React, {
  useState,
  useMemo,
  useTransition,
  useRef,
  useEffect,
  useCallback,
} from 'react'
import { useToast } from '@/components/ToastProvider'
import Link from 'next/link'
import type {
  ImmigrationCaseUI,
  ServiceTypeUI,
  MilestoneUI,
  PaymentUI,
} from '@/lib/immigration.types'
import {
  Loader2,
  DollarSign,
  Clock,
  FileText,
  X,
  CheckCircle,
  Check,
  Bold,
  Italic,
  List,
  Link as LinkIcon, // Kept for TipTap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import PaymentFormModal from '@/components/payments/PaymentFormModal'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
// Import types needed for PaymentFormModal from the main app types
import type { Project, Payment } from '@/lib/types'
// Import TipTap
import {
  useEditor,
  EditorContent,
} from '@tiptap/react'
import { BubbleMenu } from '@tiptap/extension-bubble-menu' // CORRECTED: Import from extension
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TipTapLink from '@tiptap/extension-link'

/* ===========================================================
    IMM:STATE@1 — tiny storage-backed state (NO new files)
    -----------------------------------------------------------
    - Exported hook: useInmigrationState()
    - Persists to sessionStorage
    - Broadcasts 'inmigration:updated' on write
    - Seeds from existing app fixtures if provided
    =========================================================== */

// IMM:STORAGE_KEYS cases=inmigration:cases payments=inmigration:payments
const STORAGE_KEYS = {
  cases: 'inmigration:cases',
  payments: 'inmigration:payments',
} as const

// IMM:EVENT inmigration:updated
const UPDATE_EVENT = 'inmigration:updated' as const

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStorage<T>(key: string, val: T) {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(key, JSON.stringify(val))
    window.dispatchEvent(new Event(UPDATE_EVENT))
  } catch {
    /* no-op */
  }
}

/**
 * IMM:SEED — How seeding works without adding imports/files:
 * - If storage is empty, we try to pull seed data from a global set by your app:
 * (globalThis as any).__INMIGRATION_SEED__ = { cases: CASES, payments: PAYMENTS }
 * - This keeps us from guessing import paths and avoids new files.
 * - If you prefer direct imports later, replace this block with your fixture imports.
 */
function getSeed(): {
  cases: ImmigrationCaseUI[]
  payments: PaymentUI[]
} {
  const g = (globalThis as any).__INMIGRATION_SEED__
  return {
    cases: Array.isArray(g?.cases) ? (g.cases as ImmigrationCaseUI[]) : [],
    payments: Array.isArray(g?.payments) ? (g.payments as PaymentUI[]) : [],
  }
}

export function useInmigrationState(): {
  cases: ImmigrationCaseUI[]
  payments: PaymentUI[]
  setCases: (rows: ImmigrationCaseUI[]) => void
  setPayments: (rows: PaymentUI[]) => void
  updateCase: (id: string, patch: Partial<ImmigrationCaseUI>) => void
  addPayment: (p: PaymentUI) => void
} {
  const [cases, setCasesState] = useState<ImmigrationCaseUI[]>([])
  const [payments, setPaymentsState] = useState<PaymentUI[]>([])

  // Mount: hydrate from storage or seed
  useEffect(() => {
    const storedCases = readStorage<ImmigrationCaseUI[]>(STORAGE_KEYS.cases)
    const storedPayments = readStorage<PaymentUI[]>(STORAGE_KEYS.payments)
    if (storedCases && storedPayments) {
      setCasesState(storedCases)
      setPaymentsState(storedPayments)
    } else {
      const seed = getSeed()
      setCasesState(seed.cases)
      setPaymentsState(seed.payments)
      writeStorage(STORAGE_KEYS.cases, seed.cases)
      writeStorage(STORAGE_KEYS.payments, seed.payments)
    }
  }, [])

  // Subscribe to external writes (other pages)
  useEffect(() => {
    const onUpdate = () => {
      const nextCases = readStorage<ImmigrationCaseUI[]>(STORAGE_KEYS.cases)
      const nextPays = readStorage<PaymentUI[]>(STORAGE_KEYS.payments)
      if (nextCases) setCasesState(nextCases)
      if (nextPays) setPaymentsState(nextPays)
    }
    window.addEventListener(UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate)
  }, [])

  const setCases = useCallback((rows: ImmigrationCaseUI[]) => {
    setCasesState(rows)
    writeStorage(STORAGE_KEYS.cases, rows)
  }, [])

  const setPayments = useCallback((rows: PaymentUI[]) => {
    setPaymentsState(rows)
    writeStorage(STORAGE_KEYS.payments, rows)
  }, [])

  const updateCase = useCallback(
    (id: string, patch: Partial<ImmigrationCaseUI>) => {
      setCasesState((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
        writeStorage(STORAGE_KEYS.cases, next)
        return next
      })
    },
    [],
  )

  const addPayment = useCallback((p: PaymentUI) => {
    setPaymentsState((prev) => {
      const next = [...prev, p]
      writeStorage(STORAGE_KEYS.payments, next)
      return next
    })
  }, [])

  return { cases, payments, setCases, setPayments, updateCase, addPayment }
}

/* =========================
    Helpers (existing)
    ========================= */

// CORRECTED: To use Cents and match your payments standard
export const formatCurrencyRD = (valueInCents: number | undefined | null) => {
  if (valueInCents === undefined || valueInCents === null) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2, // Match payment standard
    maximumFractionDigits: 2,
  }).format(valueInCents / 100) // Divide cents
}

export const formatDate = (dateString?: string | null) => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString + 'T00:00:00') // Treat as local date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
  } catch (e) {
    return 'N/A'
  }
}

export const formatDateTime = (isoString?: string | null) => {
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
  } catch (e) {
    return 'N/A'
  }
}

export const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

/* =========================
    Component 1: ProgressStepper
    ========================= */

interface ProgressStepperProps {
  milestones: MilestoneUI[]
  currentMilestoneId: string
  onSetMilestone: (id: string) => void
}

export function ProgressStepper({
  milestones,
  currentMilestoneId,
  onSetMilestone,
}: ProgressStepperProps) {
  const currentIndex = milestones.findIndex(
    (m) => m.id === currentMilestoneId,
  )

  return (
    <div className="w-full overflow-x-auto py-2">
      <nav className="flex items-center" aria-label="Progress">
        {milestones.map((milestone, index) => {
          // A milestone is considered "completed" if it's before the current index
          const isCompleted = index < currentIndex
          const isCurrent = milestone.id === currentMilestoneId

          return (
            <React.Fragment key={milestone.id}>
              {/* Step */}
              <button
                onClick={() => onSetMilestone(milestone.id)}
                className="flex flex-col items-center px-4 py-2"
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
              {/* Connector */}
              {index < milestones.length - 1 && (
                <div
                  className={clsx(
                    'h-0.5 w-full flex-1',
                    isCompleted ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </nav>
    </div>
  )
}

/* =========================
    Component 2: PaymentsPanel
    ========================= */

interface PaymentsPanelProps {
  linkedPayments: PaymentUI[]
  balanceDopCents?: number | null
  onLinkPayment: () => void
  onUnlinkPayment: (payment: PaymentUI) => void
}

export function PaymentsPanel({
  linkedPayments,
  balanceDopCents,
  onLinkPayment,
  onUnlinkPayment,
}: PaymentsPanelProps) {
  const hasBalance = Number(balanceDopCents || 0) > 0

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <div className="border-b border-[var(--border-subtle)] p-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Payments
        </h3>
        <div className="text-right">
          <div
            className={clsx(
              'font-semibold',
              hasBalance
                ? 'text-[var(--warning)]'
                : 'text-[var(--success)]',
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
                {formatCurrencyRD(p.amountDopCents)}
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
        <Button variant="outline" className="w-full" onClick={onLinkPayment}>
          <DollarSign size={16} className="mr-2" />
          {/* IMM:PAYMENT_LABEL — normalized */}
          Record Payment
        </Button>
      </div>
    </div>
  )
}

/* =========================
    Component 5: NotesPanel (with TipTap)
    ========================= */

interface NotesPanelProps {
  initialContent?: string | null
  onSaveNotes: (newContent: string) => void
}

export function NotesPanel({ initialContent, onSaveNotes }: NotesPanelProps) {
  const [isPending, startTransition] = useTransition()
  // The case model stores notes as a string. We'll use TipTap
  // but save the content as plain text to match the model.
  const [notes, setNotes] = useState(initialContent || '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Tweak starter kit for a simple notes panel
        heading: { levels: [2, 3] },
        horizontalRule: false,
        blockquote: false,
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder:
          'Add notes about 221(g) requirements, client communications, etc.',
      }),
      Highlight,
      TipTapLink.configure({ openOnClick: true }),
    ],
    content: notes,
    onUpdate: ({ editor }) => {
      // For this mock, we save plain text to match the `string` type
      setNotes(editor.getText())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none p-4 rounded-b-[var(--radius-lg)] min-h-[150px] bg-white border border-[var(--border)]',
      },
    },
  })

  // Sync editor if initial content changes
  useEffect(() => {
    if (editor && !editor.isDestroyed && initialContent !== editor.getText()) {
      editor.commands.setContent(initialContent || '')
    }
  }, [initialContent, editor])

  const handleSave = () => {
    if (!editor) return
    startTransition(() => {
      onSaveNotes(editor.getText())
    })
  }

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-5">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Case Notes
        </h3>
        {/* TipTap Bubble Menu */}
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{ duration: 100 }}
            className="flex gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] p-1 shadow-[var(--shadow-2)]"
          >
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={clsx(
                'p-2 rounded',
                editor.isActive('bold')
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--bg-muted)]',
              )}
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={clsx(
                'p-2 rounded',
                editor.isActive('italic')
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--bg-muted)]',
              )}
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={clsx(
                'p-2 rounded',
                editor.isActive('bulletList')
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--bg-muted)]',
              )}
            >
              <List size={16} />
            </button>
            <button
              onClick={setLink}
              className={clsx(
                'p-2 rounded',
                editor.isActive('link')
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--bg-muted)]',
              )}
            >
              <LinkIcon size={16} />
            </button>
          </BubbleMenu>
        )}
      </div>
      <div className="p-5">
        <EditorContent editor={editor} />
      </div>
      <div className="border-t border-[var(--border-subtle)] p-4 flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : null}
          Save Notes
        </Button>
      </div>
    </div>
  )
}