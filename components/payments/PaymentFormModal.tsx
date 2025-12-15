// components/payments/PaymentFormModal.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type {
  Payment,
  Lead,
  ClassStudent,
  PaymentMethod,
  ProjectType,
  Project,
} from '@/lib/types'
import type { InmigrationCaseUI } from '@/lib/inmigration.types'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'transfer', 'other']

const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]'

// Link targets supported by this form
type LinkType = 'none' | 'lead' | 'student' | 'project' | 'inmigration'

/*
|--------------------------------------------------------------------------
| Modal Component
|--------------------------------------------------------------------------
*/
interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  initialData: Partial<Payment> | null
  isSaving: boolean
  leads: Lead[]
  students: ClassStudent[]
  projects: Project[]
  inmigrationCases: InmigrationCaseUI[]
  project?: {
    id: string
    name: string
    type: ProjectType
    clientName?: string
  } | null
}

export default function PaymentFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving,
  leads,
  students,
  projects = [],
  inmigrationCases = [],
  project,
}: PaymentFormModalProps) {
  const isEditing = !!initialData?.id

  const [amountDop, setAmountDop] = useState('')
  const [dateReceived, setDateReceived] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [memo, setMemo] = useState('')
  const [linkType, setLinkType] = useState<LinkType>('none')
  const [linkedId, setLinkedId] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const today = new Date().toISOString().split('T')[0]

    setAmountDop(
      initialData?.amountDopCents
        ? (initialData.amountDopCents / 100).toString()
        : ''
    )
    setDateReceived(initialData?.dateReceived || today)
    setMethod(initialData?.method || 'cash')
    setMemo(initialData?.memo || '')

    if (project?.id) {
      setLinkType('project')
      setLinkedId(project.id)
    } else if (initialData?.projectId) {
      setLinkType('project')
      setLinkedId(initialData.projectId)
    } else if ((initialData as any)?.caseId) {
      setLinkType('inmigration')
      setLinkedId((initialData as any).caseId)
    } else if (initialData?.studentId) {
      setLinkType('student')
      setLinkedId(initialData.studentId)
    } else if (initialData?.leadId) {
      setLinkType('lead')
      setLinkedId(initialData.leadId)
    } else {
      setLinkType('none')
      setLinkedId('')
    }
  }, [isOpen, initialData, project])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: initialData?.id || undefined,
      amountDopCents: Math.round(parseFloat(amountDop) * 100) || 0,
      dateReceived,
      method,
      memo,
      leadId: linkType === 'lead' ? linkedId : null,
      studentId: linkType === 'student' ? linkedId : null,
      projectId: linkType === 'project' ? linkedId : null,
      caseId: linkType === 'inmigration' ? linkedId : null,
    })
  }

  const labelType = (t: ProjectType) => (t === 'website' ? 'Website' : 'Software')

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
                  {isEditing ? 'Edit Payment' : 'Record New Payment'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="max-h[70vh] space-y-4 overflow-y-auto p-6">
                <p className="text-sm text-[var(--text-secondary)]">
                  All payments are recorded in RD$ (DOP).
                </p>

                {/* Project context pill (when opened from Projects module) */}
                {project && (
                  <FormRow label="For Project">
                    <div
                      className={clsx(
                        'flex w-fit max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-1 text-sm font-medium',
                        'bg-[var(--primary-050)] text-[var(--primary)]'
                      )}
                    >
                      <Briefcase size={14} />
                      <span className="truncate">
                        {project.clientName || 'Sin Cliente'} • {labelType(project.type)}
                      </span>
                    </div>
                  </FormRow>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormRow label="Amount (RD$)">
                    <input
                      type="number"
                      name="amountDop"
                      value={amountDop}
                      onChange={(e) => setAmountDop(e.target.value)}
                      className={inputBaseClass}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      disabled={isSaving}
                    />
                  </FormRow>
                  <FormRow label="Date Received">
                    <input
                      type="date"
                      name="date_received"
                      value={dateReceived}
                      onChange={(e) => setDateReceived(e.target.value)}
                      className={inputBaseClass}
                      required
                      disabled={isSaving}
                    />
                  </FormRow>
                </div>

                <FormRow label="Payment Method">
                  <select
                    name="method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className={inputBaseClass}
                    disabled={isSaving}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m} className="capitalize">
                        {m}
                      </option>
                    ))}
                  </select>
                </FormRow>

                {/* Hide linking controls if invoked from a specific project */}
                {!project && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormRow label="Link to...">
                      <select
                        value={linkType}
                        onChange={(e) => {
                          setLinkType(e.target.value as LinkType)
                          setLinkedId('')
                        }}
                        className={inputBaseClass}
                        disabled={isSaving}
                      >
                        <option value="none">Nothing</option>
                        <option value="lead">Lead</option>
                        <option value="student">Class Student</option>
                        <option value="project">Project</option>
                        <option value="inmigration">Inmigration Case</option>
                      </select>
                    </FormRow>

                    <div
                      className={clsx(
                        'transition-opacity',
                        linkType === 'none' && 'pointer-events-none opacity-0'
                      )}
                    >
                      {linkType === 'lead' && (
                        <FormRow label="Select Lead">
                          <select
                            name="leadId"
                            value={linkedId}
                            onChange={(e) => setLinkedId(e.target.value)}
                            className={inputBaseClass}
                            disabled={isSaving}
                            required
                          >
                            <option value="" disabled>
                              Choose a lead...
                            </option>
                            {leads.map((lead) => (
                              <option key={lead.id} value={lead.id}>
                                {lead.contact?.fullName} ({lead.serviceType})
                              </option>
                            ))}
                          </select>
                        </FormRow>
                      )}

                      {linkType === 'student' && (
                        <FormRow label="Select Student">
                          <select
                            name="studentId"
                            value={linkedId}
                            onChange={(e) => setLinkedId(e.target.value)}
                            className={inputBaseClass}
                            disabled={isSaving}
                            required
                          >
                            <option value="" disabled>
                              Choose a student...
                            </option>
                            {students.map((student) => (
                              <option key={student.id} value={student.id}>
                                {student.contact?.fullName}
                              </option>
                            ))}
                          </select>
                        </FormRow>
                      )}

                      {linkType === 'project' && (
                        <FormRow label="Select Project">
                          <select
                            name="projectId"
                            value={linkedId}
                            onChange={(e) => setLinkedId(e.target.value)}
                            className={inputBaseClass}
                            disabled={isSaving}
                            required
                          >
                            <option value="" disabled>
                              Choose a project...
                            </option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.clientName} ({labelType(p.type)})
                              </option>
                            ))}
                          </select>
                        </FormRow>
                      )}

                      {linkType === 'inmigration' && (
                        <FormRow label="Select Inmigration Case">
                          <select
                            name="caseId"
                            value={linkedId}
                            onChange={(e) => setLinkedId(e.target.value)}
                            className={inputBaseClass}
                            disabled={isSaving}
                            required
                          >
                            <option value="" disabled>
                              Choose a case...
                            </option>
                            {inmigrationCases.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.clientName} ({c.service})
                              </option>
                            ))}
                          </select>
                        </FormRow>
                      )}
                    </div>
                  </div>
                )}

                <FormRow label="Memo (Optional)">
                  <textarea
                    name="memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={3}
                    className={inputBaseClass}
                    placeholder="e.g., Initial 50% deposit for website"
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
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Save Payment'
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
