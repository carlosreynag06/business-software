// lib/inmigration.types.ts
// Defines all UI data shapes for the Inmigration module
// Based on 'Imigrations Services Plan.pdf' and new requirements

/**
 * Defines the specific service names for UI display
 */
export type ServiceTypeUI =
  | 'Visa B1/B2'
  | 'Green Card Petition (I-130)'
  | 'Citizenship (N-400)'
  | 'K-1 Fiancé(e)'
  | 'Student Visa (F-1/M-1)'
  | 'Consultation' // ADDED

/**
 * Represents a single step in the procedural stepper
 * MODIFIED: To match Supabase schema (id = uuid, ms_id = 'ds160')
 */
export interface MilestoneUI {
  id: string // The database UUID (primary key)
  ms_id: string // The string identifier (e.g., 'ds160', 'mrv')
  label: string // e.g., 'DS-160 Submitted', 'MRV Paid'
  dueDate?: string | null // ISO date string
  completed: boolean
  flags?: string[] // e.g., '221g', 'adminProcessing'
  position: number // Display order
}

/**
 * Represents a single inmigration case
 * This is the combined UI object, including related data
 */
export interface InmigrationCaseUI {
  id: string
  clientId: string // link to existing contact id
  clientName: string

  // ADDED (detail-page only, optional for back-compat)
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string

  // NEW (identifiers shown/edited in detail modal)
  caseNumber?: string
  passportNumber?: string
  dsConfirmation?: string

  service: ServiceTypeUI
  milestones: MilestoneUI[] // ordered path
  current_milestone_id: string // highlights pill in table (this is the 'ms_id')
  linked_payment_ids: string[] // PaymentUI ids (from join)
  notes?: string // rich text (TipTap JSON) or plain text
  activity: { at: string; text: string }[]
  // ADDED per new requirements
  date: string // ISO date string for consult/start date
  costDopCents: number // Total cost/price of the service in DOP Cents

  // ADDED from v_inmigration_case_financials view
  amount_paid_dop_cents: number
  balance_dop_cents: number
}

/**
 * Represents a payment, mirroring the existing app structure
 * MODIFIED: To match Supabase schema and add UI context
 */
export interface PaymentUI {
  id: string
  date: string // ISO date string
  method: 'Cash' | 'Card' | 'Transfer'
  amount_dop_cents: number // Amount in DOP Cents
  notes?: string
  tags: string[] // MODIFIED: "Gov't fee" | 'Service fee' (now text[])
  case_id?: string | null // MODIFIED: Replaces linkedTo
  partial_of?: string | null // parent payment id if partial
  context_label?: string | null // ADDED: For UI chip (e.g., "Inmigration: ...")
}