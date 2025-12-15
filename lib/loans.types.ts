// lib/loans.types.ts

export const LOAN_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'] as const
export type LoanFrequency = (typeof LOAN_FREQUENCIES)[number]

export const LOAN_STATUSES = ['active', 'paid', 'past_due'] as const
export type LoanStatus = (typeof LOAN_STATUSES)[number]

/**
 * Core record used across:
 * - Table view
 * - Details drawer/modal
 * - Edit form
 */
export interface Loan {
  // Primary identifier
  id: string

  // Client Info
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientAddress?: string | null

  // Loan Details
  /** Date the loan was issued (YYYY-MM-DD) */
  loanDate: string
  
  /** Principal loan amount */
  amount: number
  
  /** Manual interest percentage (e.g. 5 for 5%) */
  interestRate: number
  
  /** Payment frequency */
  frequency: LoanFrequency
  
  /** Current state of the loan */
  status: LoanStatus
  
  /** Free-form notes */
  notes?: string | null
}

/**
 * Helper type for the form components.
 */
export interface LoanFormValues {
  id?: string
  clientName: string
  clientPhone?: string | null
  clientEmail?: string | null
  clientAddress?: string | null
  loanDate: string
  amount: number
  interestRate: number
  frequency: LoanFrequency
  status: LoanStatus
  notes?: string | null
}