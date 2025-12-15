// components/projects/ProjectsTable.tsx
'use client'

// (MODIFIED) Import hooks, Button, createPortal, and new icons/utils
import React, { useState, useEffect, useRef, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button' // Use standard Button
import type { Project } from '@/app/(app)/projects/actions'
import { Modal, Field } from '@/components/projects/AddProject' // Use primitives
import { Briefcase, DollarSign } from 'lucide-react' // ADDED
import clsx from 'clsx' // ADDED

// (ADDED) Import real payment modal and action
import PaymentFormModal from '@/components/payments/PaymentFormModal'
import { upsertPayment } from '@/app/(app)/payments/actions'
import { useToast } from '@/components/ToastProvider'

export type ProjectType = Project['type']

// (NEW) Define an internal project type that includes payment info
type ProjectWithPayments = Project & {
  amountPaid: number
}

export default function ProjectsTable(props: {
  items: Project[]
  onEdit: (p: Project) => void
  onDelete: (id: string) => void
  onOpen: (p: Project) => void
  onBump: (id: string) => void
}) {
  // (NEW) Internal state to manage projects and payment status
  const [projects, setProjects] = React.useState<ProjectWithPayments[]>([])
  const [paymentModal, setPaymentModal] = React.useState<{
    open: boolean
    project: ProjectWithPayments | null
  }>({ open: false, project: null })

  // (NEW) State for save handler
  const [isPending, startTransition] = useTransition()
  const { notify } = useToast()

  // (NEW) Sync initial props to internal state
  React.useEffect(() => {
    setProjects(
      props.items.map((p) => ({
        ...p,
        // (MODIFIED) Use the amountPaid from the data model (default 0)
        amountPaid: Number((p as any).amountPaid ?? 0),
      }))
    )
  }, [props.items])

  // (NEW) Handler to save a payment using the real modal
  const handleSavePayment = (formData: any) => {
    startTransition(async () => {
      const result = await upsertPayment(formData)

      if (result.success && result.data) {
        notify({
          title: 'Payment Saved',
          description: `Payment for ${formatDOP(
            result.data.amountDopCents / 100
          )} saved.`,
          variant: 'success',
        })
        setPaymentModal({ open: false, project: null })
        // Revalidation is handled by the server action
      } else {
        notify({
          title: 'Save Failed',
          description: result.error || 'Could not save the payment.',
          variant: 'danger',
        })
      }
    })
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[color:var(--ui-200,#E5E7EB)] bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-[color:var(--ui-50,#F9FAFB)] text-[color:var(--text-secondary,#6B7280)]">
            <tr>
              {/* MODIFIED: Restored Client column */}
              <Th>Client</Th>
              <Th>Project / Description</Th>
              <Th>Budget</Th>
              <Th>Amt. Paid</Th>
              <Th>Balance</Th>
              {/* REMOVED: Notes column */}
              <Th>Start</Th>
              <Th>Due</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="border-t border-[color:var(--ui-200,#E5E7EB)]"
              >
                {/* MODIFIED: Client Cell */}
                <Td>{p.clientName}</Td>

                {/* MODIFIED: Project cell (no pill) */}
                <Td>
                  {/* Pill for Type */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={clsx(
                        'flex w-fit max-w-xs items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium',
                        p.type === 'website'
                          ? 'bg-blue-100 text-blue-800' // Example color
                          : 'bg-purple-100 text-purple-800' // Example color
                      )}
                    >
                      <Briefcase size={14} />
                      <span className="truncate">{labelType(p.type)}</span>
                    </span>
                  </div>
                  <button
                    className="font-medium hover:underline text-left max-w-[320px] truncate"
                    title={p.description ?? p.name}
                    onClick={() => props.onOpen(p)}
                  >
                    {p.description ?? p.name}
                  </button>
                </Td>

                {/* (MODIFIED) Columns for payment (values are already pesos) */}
                <Td>{formatDOP(p.budgetDop)}</Td>
                <Td className="text-[var(--success,#059669)] font-medium">
                  {formatDOP(p.amountPaid)}
                </Td>
                <Td className="font-medium">
                  {formatDOP(p.budgetDop - p.amountPaid)}
                </Td>

                {/* REMOVED: Notes column */}

                <Td>{formatDate(p.startDate)}</Td>
                <Td>{formatDate(p.dueDate)}</Td>

                <Td className="text-right">
                  <div className="inline-flex gap-2">
                    <Menu
                      onEdit={() => props.onEdit(p)}
                      onDelete={() => props.onDelete(p.id)}
                      // (NEW) Pass handler to open modal
                      onRecordPayment={() =>
                        setPaymentModal({ open: true, project: p })
                      }
                    />
                  </div>
                </Td>
              </tr>
            ))}
            {props.items.length === 0 && (
              <tr>
                <Td
                  className="py-8 text-center text-[color:var(--text-secondary,#6B7280)]"
                  colSpan={8} // (MODIFIED) Colspan updated to 8
                >
                  No projects found.
                </Td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* (NEW) Render the REAL payment modal */}
      {paymentModal.open && (
        <PaymentFormModal
          isOpen={paymentModal.open}
          onClose={() => setPaymentModal({ open: false, project: null })}
          onSave={handleSavePayment}
          isSaving={isPending}
          initialData={null} // Always create new payment from this context
          // (NEW) Pass project context
          project={{
            id: paymentModal.project!.id,
            name: paymentModal.project!.name,
            type: paymentModal.project!.type,
            clientName: paymentModal.project!.clientName,
          }}
          // (NEW) Pass empty arrays to satisfy modal props
          leads={[]}
          students={[]}
        />
      )}
    </>
  )
}

/* ---------- local primitives ---------- */
function Th(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <th className={`px-4 py-2 text-left font-medium ${props.className || ''}`}>
      {props.children}
    </th>
  )
}
function Td(
  props: React.PropsWithChildren<{ className?: string; colSpan?: number }>
) {
  return (
    <td
      className={`px-4 py-3 align-top ${props.className || ''}`}
      colSpan={props.colSpan}
    >
      {props.children}
    </td>
  )
}

// (BUG FIX) Menu component completely rewritten to use createPortal
function Menu(props: {
  onEdit: () => void
  onDelete: () => void
  onRecordPayment: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4, // 4px below button
        right: window.innerWidth - rect.right, // Align right edge to button's right edge
      })
      setIsOpen(true)
    }
  }

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className="px-2 py-1 rounded-lg border border-[color:var(--ui-300,#D1D5DB)]"
        onClick={(e) => {
          e.stopPropagation()
          isOpen ? setIsOpen(false) : openMenu()
        }}
      >
        •••
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-48 rounded-lg border border-[color:var(--ui-200,#E5E7EB)] bg-white shadow-lg p-1.5"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              className="menu-item"
              onClick={() => handleAction(props.onEdit)}
            >
              Edit
            </button>
            {/* (ADDED) Record Payment Button */}
            <button
              className="menu-item"
              onClick={() => handleAction(props.onRecordPayment)}
            >
              <DollarSign size={14} className="mr-2" /> Record Payment
            </button>

            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              className="menu-item text-[var(--danger-700,#B91C1C)]"
              onClick={() => handleAction(props.onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body
        )}
    </div>
  )
}

/* (DELETED) Local PaymentModal component */

/* ---------- small helpers ---------- */
// (KEPT) This function is correct because actions.ts provides PESOS
export function formatDOP(n: number) {
  try {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `RD$ ${n.toLocaleString()}`
  }
}
export function formatDate(s: string | null) {
  if (!s) return 'N-A'
  try {
    const d = new Date(s + 'T00:00:00') // Treat as local date
    const dd = `${d.getDate()}`.padStart(2, '0')
    const mm = `${d.getMonth() + 1}`.padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch (e) {
    return 'N/A'
  }
}
export function labelType(t: ProjectType) {
  return t === 'website' ? 'Website' : 'Software'
}

const style = `
.btn-secondary{padding:0.375rem 0.5rem;border-radius:.5rem;border:1px solid var(--ui-300,#D1D5DB);font-size:.75rem}
.inp{padding:.5rem .75rem;border:1px solid var(--ui-300,#D1D5DB);border-radius:.5rem;background:white}
.menu-item{display:flex;align-items:center;width:100%;text-align:left;padding:.5rem .75rem;position:relative;z-index:10;font-size: 0.875rem; line-height: 1.25rem; border-radius: 0.375rem;}
.menu-item:hover{background:rgba(0,0,0,0.04)}
`
const __once =
  typeof window !== 'undefined' &&
  (document.getElementById('pcs-style') ||
    (() => {
      const s = document.createElement('style')
      s.id = 'pcs-style'
      s.innerHTML = style
      document.head.appendChild(s)
      return s
    })())