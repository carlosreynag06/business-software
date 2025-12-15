'use client'

import React from 'react'
import { X, Phone, Mail, MapPin, DollarSign, Percent, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import type { Loan } from '@/lib/loans.types'
import clsx from 'clsx'

interface LoanDetailsProps {
  isOpen: boolean
  onClose: () => void
  loan: Loan | null
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function LoanDetails({ isOpen, onClose, loan }: LoanDetailsProps) {
  if (!loan) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 right-0 flex max-w-full pl-10"
          >
            <div className="w-screen max-w-md border-l border-[var(--border-subtle)] bg-[var(--bg-page)] shadow-[var(--shadow-3)]">
              <div className="flex h-full flex-col overflow-y-scroll">
                
                {/* Header */}
                <div className="bg-[var(--surface-elev-1)] px-6 py-6 shadow-[var(--shadow-1)]">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {loan.clientName}
                    </h2>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        className="rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        onClick={onClose}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">Loan Details</p>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6 px-6 py-6">
                  
                  {/* Client Info */}
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Contact Info
                    </h3>
                    <div className="space-y-3 rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)]">
                      <div className="flex items-center gap-3">
                        <Phone size={16} className="text-[var(--text-secondary)]" />
                        <span className="text-sm text-[var(--text-primary)]">{loan.clientPhone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-[var(--text-secondary)]" />
                        <span className="text-sm text-[var(--text-primary)]">{loan.clientEmail || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin size={16} className="text-[var(--text-secondary)]" />
                        <span className="text-sm text-[var(--text-primary)]">{loan.clientAddress || 'N/A'}</span>
                      </div>
                    </div>
                  </section>

                  {/* Loan Stats */}
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Financials
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-[var(--radius-md)] bg-[var(--primary-050)] p-4">
                        <div className="flex items-center gap-2 text-[var(--primary-700)]">
                          <DollarSign size={16} />
                          <span className="text-xs font-semibold uppercase">Principal</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-[var(--primary-700)]">
                          {formatCurrency(loan.amount)}
                        </p>
                      </div>
                      <div className="rounded-[var(--radius-md)] bg-[var(--bg-muted)] p-4">
                         <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                          <Percent size={16} />
                          <span className="text-xs font-semibold uppercase">Interest</span>
                        </div>
                        <p className="mt-1 text-xl font-bold text-[var(--text-primary)]">
                          {loan.interestRate}%
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Configuration */}
                  <section>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      Configuration
                    </h3>
                    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)] space-y-3">
                       <div className="flex justify-between">
                         <span className="text-sm text-[var(--text-secondary)]">Loan Date</span>
                         <span className="text-sm font-medium text-[var(--text-primary)]">{loan.loanDate}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-sm text-[var(--text-secondary)]">Frequency</span>
                         <span className="text-sm font-medium capitalize text-[var(--text-primary)]">{loan.frequency}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-sm text-[var(--text-secondary)]">Status</span>
                         <span className={clsx(
                           "text-sm font-medium capitalize",
                           loan.status === 'active' ? "text-[var(--primary)]" : 
                           loan.status === 'paid' ? "text-[var(--success)]" : "text-[var(--danger)]"
                         )}>
                           {loan.status.replace('_', ' ')}
                         </span>
                       </div>
                    </div>
                  </section>

                  {/* Notes */}
                  {loan.notes && (
                    <section>
                      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                        Notes
                      </h3>
                      <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-4 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)]">
                        {loan.notes}
                      </div>
                    </section>
                  )}

                </div>

                {/* Footer */}
                <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-6">
                  <Button variant="outline" className="w-full" onClick={onClose}>
                    Close Details
                  </Button>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}