// components/projects/AddProject.tsx
'use client'

import React from 'react'
import type { Project } from '@/app/(app)/projects/actions'
// REMOVED: ClassStudent import

// MODIFIED: Form state to match your requirements
export type ProjectFormState = {
  // keep `name` for compatibility with callers, but drive it from `description`
  name: string
  description?: string
  clientName: string // RE-ADDED: Manual client name
  // REMOVED: contactId
  type: Project['type']
  // REMOVED: status
  startDate: string | null // MODIFIED: Allow null
  dueDate: string | null // MODIFIED: Allow null
  budgetDopPesos: string // RENAMED from budgetDop and set to string
  // REMOVED: notes
  leadId?: string
}

export default function AddProject(props: {
  mode: 'create' | 'edit'
  initial?: Project
  onClose: () => void
  onSubmit: (v: ProjectFormState) => Promise<void>
  // REMOVED: students prop
}) {
  const [form, setForm] = React.useState<ProjectFormState>(() => {
    const p = props.initial
    // Drive description from existing data (prefer any existing description, else name)
    const initialDescription = (p as any)?.description ?? p?.name ?? ''

    return {
      // Important: keep `name` in sync with `description` so tables show the new Description
      name: initialDescription,
      description: initialDescription,
      clientName: p?.clientName ?? '', // MODIFIED: Use clientName
      // REMOVED: contactId
      type: p?.type ?? 'website',
      // REMOVED: status
      startDate: p?.startDate ?? today(),
      dueDate: p?.dueDate ?? today(30),
      budgetDopPesos: (p?.budgetDop ?? 0).toString(), // MODIFIED
      // REMOVED: notes
      leadId: (p as any)?.leadId ?? '', // leadId is not on Project type
    }
  })
  const [submitting, setSubmitting] = React.useState(false)

  function set<K extends keyof ProjectFormState>(k: K, v: ProjectFormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit() {
    setSubmitting(true)
    try {
      await props.onSubmit(form)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal onClose={props.onClose}>
      <div className="w-full max-w-2xl p-4">
        <h3 className="text-lg font-semibold">
          {props.mode === 'create' ? 'Add Project' : 'Edit Project'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* MODIFIED: Client FIRST - Changed back to <input> */}
          <Field label="Client">
            <input
              className="inp"
              value={form.clientName}
              onChange={(e) => set('clientName', e.target.value)}
            />
          </Field>

          <Field label="Type">
            <select
              className="inp"
              value={form.type}
              onChange={(e) => set('type', e.target.value as Project['type'])}
            >
              <option value="website">Website</option>
              <option value="software">Software</option>
            </select>
          </Field>

          {/* REMOVED: Status Field */}

          <Field label="Start date">
            <input
              type="date"
              className="inp"
              value={form.startDate || ''} // Handle null
              onChange={(e) => set('startDate', e.target.value)}
            />
          </Field>

          <Field label="Due date">
            <input
              type="date"
              className="inp"
              value={form.dueDate || ''} // Handle null
              onChange={(e) => set('dueDate', e.target.value)}
            />
          </Field>

          {/* MODIFIED: Budget (RD$) */}
          <Field label="Budget (RD$)">
            <input
              type="text"
              inputMode="decimal"
              className="inp"
              value={form.budgetDopPesos}
              onChange={(e) => set('budgetDopPesos', e.target.value)}
              placeholder="0"
            />
          </Field>

          {/* Lead ID field intentionally removed from UI for now */}
        </div>

        {/* MODIFIED: Changed "Notes" to "Description" and made it a textarea */}
        <div className="grid grid-cols-1 gap-3 mt-3">
          <Field label="Description">
            <textarea
              className="inp"
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => {
                const v = e.target.value
                // Keep both fields in sync so downstream consumers (expecting `name`)
                // still work; UI table will read `description` if present.
                setForm((f) => ({ ...f, description: v, name: v }))
              }}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-[color:var(--ui-300,#D1D5DB)]"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded-lg bg-[var(--primary,#4F46E5)] text-white disabled:opacity-60"
            disabled={submitting}
            onClick={submit}
          >
            {props.mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ---------- primitives local to this component ---------- */
export function Modal(props: React.PropsWithChildren<{ onClose: () => void }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={props.onClose} />
      <div className="relative bg-white rounded-2xl border border-[color:var(--ui-200,#E5E7EB)] shadow-xl w-full max-w-3xl">
        {props.children}
      </div>
    </div>
  )
}
export function Field(
  props: React.PropsWithChildren<{ label: string; className?: string }>
) {
  return (
    <label className={`flex flex-col gap-1 ${props.className || ''}`}>
      <span className="text-xs font-medium text-[var(--text-secondary,#6B7280)]">
        {props.label}
      </span>
      {props.children}
    </label>
  )
}
function today(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}