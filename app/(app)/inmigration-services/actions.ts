// app/(app)/inmigration-services/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase.types'
import type {
  InmigrationCaseUI,
  MilestoneUI,
  PaymentUI,
  ServiceTypeUI,
} from '@/lib/inmigration.types'

// Helper for default milestones (logic moved from client)
function getDefaultMilestones(service: ServiceTypeUI): {
  milestones: Omit<MilestoneUI, 'id' | 'case_id' | 'user_id' | 'position'>[]
  currentMilestoneId: string
} {
  const $M = (
    label: string,
    id: string,
    completed = false,
  ): Omit<MilestoneUI, 'id' | 'case_id' | 'user_id' | 'position'> => ({
    ms_id: id,
    label,
    dueDate: null,
    completed,
    flags: [],
  })

  let milestones: Omit<
    MilestoneUI,
    'id' | 'case_id' | 'user_id' | 'position'
  >[] = []
  let currentMilestoneId = 'ds160'

  switch (service) {
    case 'Visa B1/B2':
      milestones = [
        $M('DS-160 Submitted', 'ds160'),
        $M('MRV Paid', 'mrv'),
        $M('Appointments Scheduled', 'appts'),
        $M('VAC (Sambil) Biometrics', 'vac'),
        $M('Embassy Interview', 'interview'),
        $M('Decision', 'decision'),
      ]
      currentMilestoneId = 'ds160'
      break
    case 'Green Card Petition (I-130)':
      milestones = [
        $M('DS-260 Submitted', 'ds260'),
        $M('AOS/IV Fees Paid', 'nvcfees'),
        $M('Docs Uploaded to CEAC', 'ceacdocs'),
        $M('Medical Exam', 'medical'),
        $M('VAC (Sambil) Biometrics', 'vac'),
        $M('Embassy Interview', 'interview'),
        $M('Decision', 'decision'),
      ]
      currentMilestoneId = 'ds260'
      break
    case 'K-1 Fiancé(e)':
      milestones = [
        $M('DS-160 Submitted', 'ds160'),
        $M('MRV Paid ($265)', 'mrv'),
        $M('Medical Exam', 'medical'),
        $M('VAC (Sambil) Biometrics', 'vac'),
        $M('Embassy Interview', 'interview'),
        $M('Decision', 'decision'),
      ]
      currentMilestoneId = 'ds160'
      break
    case 'Student Visa (F-1/M-1)':
      milestones = [
        $M('I-20 Received', 'i20'),
        $M('SEVIS I-901 Paid', 'sevis'),
        $M('DS-160 Submitted', 'ds160'),
        $M('VAC (Sambil) Biometrics', 'vac'),
        $M('Embassy Interview', 'interview'),
        $M('Decision', 'decision'),
      ]
      currentMilestoneId = 'i20'
      break
    case 'Consultation':
      milestones = [
        $M('Consultation Scheduled', 'consult-sched'),
        $M('Payment Received', 'consult-paid'),
        $M('Consultation Done', 'consult-done'),
      ]
      currentMilestoneId = 'consult-sched'
      break
    default:
      // Consultation is the fallback
      milestones = [$M('Consultation Scheduled', 'consult-sched')]
      currentMilestoneId = 'consult-sched'
  }

  return {
    milestones: milestones.map((m, i) => ({ ...m, position: i })),
    currentMilestoneId,
  }
}

/**
 * Fetches all inmigration cases with their financial status.
 */
export async function getCases() {
  const supabase = await createSupabaseServerClient()

  // 1) Cases
  const { data: casesData, error: casesError } = await supabase
    .from('inmigration_cases')
    .select('*')
    .order('date', { ascending: false })

  if (casesError) {
    console.error('Error fetching cases:', casesError.message)
    return { error: casesError.message }
  }

  // 2) Financials view
  const { data: financialsData, error: financialsError } = await supabase
    .from('v_inmigration_case_financials')
    .select('case_id, amount_paid_dop_cents, balance_dop_cents')

  if (financialsError) {
    console.error('Error fetching financials:', financialsError.message)
    return { error: financialsError.message }
  }

  // 3) Join in JS
  const financialsMap = new Map(
    financialsData.map((f) => [
      f.case_id,
      {
        amount_paid_dop_cents: f.amount_paid_dop_cents,
        balance_dop_cents: f.balance_dop_cents,
      },
    ]),
  )

  const cases: InmigrationCaseUI[] = casesData.map((c: any) => {
    const f = financialsMap.get(c.id)
    return {
      id: c.id,
      clientName: c.client_name,
      clientEmail: c.client_email,
      clientPhone: c.client_phone,
      clientAddress: c.client_address,
      caseNumber: c.case_number,
      passportNumber: c.passport_number,
      dsConfirmation: c.ds_confirmation,
      service: c.service as ServiceTypeUI,
      date: c.date,
      costDopCents: Number(c.cost_dop_cents ?? 0),
      currentMilestoneId: c.current_milestone_id ?? null,
      amountPaidDopCents: Number(f?.amount_paid_dop_cents ?? 0),
      balanceDopCents: Number(f?.balance_dop_cents ?? c.cost_dop_cents ?? 0),
      notes: c.notes ?? null,
      milestones: [],
      activity: [],
      linked_payment_ids: [],
    }
  })

  return { data: cases }
}

/**
 * Fetches a single inmigration case by its ID, including milestones and activity.
 */
export async function getCaseById(id: string) {
  const supabase = await createSupabaseServerClient()

  const { data: caseData, error: caseError } = await supabase
    .from('inmigration_cases')
    .select('*')
    .eq('id', id)
    .single()

  if (caseError) {
    console.error('Error fetching case:', caseError.message)
    return { error: caseError.message }
  }
  if (!caseData) {
    return { error: 'Case not found' }
  }

  const [milestonesRes, activityRes, paymentsRes, finRes] = await Promise.all([
    supabase
      .from('inmigration_milestones')
      .select('*')
      .eq('case_id', id)
      .order('position', { ascending: true }),
    supabase
      .from('inmigration_case_activity')
      .select('*')
      .eq('case_id', id)
      .order('at', { ascending: false }),
    supabase
      .from('inmigration_payments')
      .select('id')
      .eq('case_id', id),
    supabase
      .from('v_inmigration_case_financials')
      .select('amount_paid_dop_cents, balance_dop_cents')
      .eq('case_id', id)
      .single(),
  ])

  if (milestonesRes.error) return { error: milestonesRes.error.message }
  if (activityRes.error) return { error: activityRes.error.message }
  if (paymentsRes.error) return { error: paymentsRes.error.message }
  // finRes may be null for brand-new cases with no payments
  const amountPaid = Number(finRes.data?.amount_paid_dop_cents ?? 0)
  const balance =
    finRes.data?.balance_dop_cents != null
      ? Number(finRes.data.balance_dop_cents)
      : Number((caseData as any).cost_dop_cents ?? 0)

  const milestones: MilestoneUI[] = milestonesRes.data.map((m) => ({
    id: m.id,
    ms_id: m.ms_id,
    label: m.label,
    dueDate: m.due_date,
    completed: m.completed,
    flags: m.flags,
    position: m.position,
  }))

  const c: any = caseData
  const caseResult: InmigrationCaseUI = {
    id: c.id,
    clientName: c.client_name,
    clientEmail: c.client_email,
    clientPhone: c.client_phone,
    clientAddress: c.client_address,
    caseNumber: c.case_number,
    passportNumber: c.passport_number,
    dsConfirmation: c.ds_confirmation,
    service: c.service as ServiceTypeUI,
    date: c.date,
    costDopCents: Number(c.cost_dop_cents ?? 0),
    currentMilestoneId: c.current_milestone_id ?? null,
    amountPaidDopCents: amountPaid,
    balanceDopCents: balance,
    notes: c.notes ?? null,
    milestones,
    activity: activityRes.data.map((a) => ({ at: a.at, text: a.text })),
    linked_payment_ids: paymentsRes.data.map((p) => p.id),
  }

  return { data: caseResult }
}

/**
 * Fetches all UI payments, joining case info for context.
 */
export async function getPayments() {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('inmigration_payments')
    .select(
      `
      *,
      case:inmigration_cases (
        client_name,
        service
      )
    `,
    )
    .order('date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error.message)
    return { error: error.message }
  }

  const payments: PaymentUI[] = data.map((p: any) => ({
    id: p.id,
    date: p.date,
    method: p.method,
    amount_dop_cents: p.amount_dop_cents,
    notes: p.notes,
    tags: p.tags,
    case_id: p.case_id,
    partial_of: p.partial_of,
    context_label: p.case
      ? `Inmigration: ${p.case.client_name} • ${p.case.service}`
      : null,
  }))

  return { data: payments }
}

// Form input type
type CreateCaseFormInput = {
  clientName: string
  service: ServiceTypeUI
  date: string
  costDopCents: number
}

/**
 * Creates a new inmigration case and its default milestones.
 */
export async function createCase(caseData: CreateCaseFormInput) {
  const supabase = await createSupabaseServerClient()

  const { milestones, currentMilestoneId } = getDefaultMilestones(
    caseData.service,
  )

  // 1) Insert case (default milestone = consultation)
  const { data: newCase, error: caseError } = await supabase
    .from('inmigration_cases')
    .insert({
      client_name: caseData.clientName,
      service: caseData.service,
      date: caseData.date,
      cost_dop_cents: caseData.costDopCents,
      client_id: null,
      current_milestone_id: 'consult-sched',
    })
    .select('id')
    .single()

  if (caseError) {
    console.error('Error creating case (Step 1):', caseError.message)
    return { error: caseError.message }
  }

  // 2) Insert milestones
  const milestonesToInsert = milestones.map((m, i) => ({
    case_id: newCase.id,
    ms_id: m.ms_id,
    label: m.label,
    due_date: m.dueDate,
    completed: m.ms_id === currentMilestoneId,
    flags: m.flags,
    position: i,
  }))

  // Ensure consult-sched exists to satisfy FK (no duplicate)
  const hasConsultSched = milestonesToInsert.some(
    (m) => m.ms_id === 'consult-sched',
  )
  if (!hasConsultSched) {
    milestonesToInsert.push({
      case_id: newCase.id,
      ms_id: 'consult-sched',
      label: 'Consultation Scheduled',
      due_date: null,
      completed: true,
      flags: [],
      position: -1,
    })
  }

  const { error: msError } = await supabase
    .from('inmigration_milestones')
    .insert(milestonesToInsert)

  if (msError) {
    console.error('Error creating milestones (Step 2):', msError.message)
    await supabase.from('inmigration_cases').delete().eq('id', newCase.id)
    return { error: msError.message }
  }

  // 3) Point case to the intended current milestone
  const { error: updateError } = await supabase
    .from('inmigration_cases')
    .update({ current_milestone_id: currentMilestoneId })
    .eq('id', newCase.id)

  if (updateError) {
    console.error('Error updating case milestone (Step 3):', updateError.message)
  }

  revalidatePath('/inmigration-services')
  return { data: newCase }
}

/**
 * Updates a case.
 */
export async function updateCase(
  caseId: string,
  patch: Partial<Database['public']['Tables']['inmigration_cases']['Row']>,
  milestones?: MilestoneUI[],
  activityLog?: string,
) {
  const supabase = await createSupabaseServerClient()

  // 1) Update case
  const { error: caseError } = await supabase
    .from('inmigration_cases')
    .update(patch)
    .eq('id', caseId)

  if (caseError) {
    console.error('Error updating case:', caseError.message)
    return { error: caseError.message }
  }

  // 2) Upsert milestones (if provided)
  if (milestones && milestones.length > 0) {
    const milestonesToUpsert = milestones.map((m) => ({
      id: m.id,
      case_id: caseId,
      ms_id: m.ms_id,
      label: m.label,
      due_date: m.dueDate,
      completed: m.completed,
      flags: m.flags,
      position: m.position,
    }))

    const { error: msError } = await supabase
      .from('inmigration_milestones')
      .upsert(milestonesToUpsert, { onConflict: 'id' })

    if (msError) {
      console.error('Error updating milestones:', msError.message)
      return { error: msError.message }
    }
  }

  // 3) Activity log (optional)
  if (activityLog) {
    const { error: actError } = await supabase
      .from('inmigration_case_activity')
      .insert({
        case_id: caseId,
        text: activityLog,
      })
    if (actError) {
      console.error('Error logging activity:', actError.message)
    }
  }

  revalidatePath('/inmigration-services')
  revalidatePath(`/inmigration-services/${caseId}`)
  return { data: 'success' }
}

/**
 * Deletes an inmigration case.
 */
export async function deleteCase(caseId: string) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('inmigration_cases')
    .delete()
    .eq('id', caseId)

  if (error) {
    console.error('Error deleting case:', error.message)
    return { error: error.message }
  }

  revalidatePath('/inmigration-services')
  return { data: 'success' }
}

/**
 * Creates a new payment.
 */
export async function createPayment(
  paymentData: Omit<
    Database['public']['Tables']['inmigration_payments']['Insert'],
    'id' | 'user_id' | 'created_at' | 'updated_at'
  >,
) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.from('inmigration_payments').insert({
    ...paymentData,
  })

  if (error) {
    console.error('Error creating payment:', error.message)
    return { error: error.message }
  }

  revalidatePath('/inmigration-services')
  if (paymentData.case_id) {
    revalidatePath(`/inmigration-services/${paymentData.case_id}`)
  }
  revalidatePath('/payments')
  return { data: 'success' }
}

/**
 * Unlinks a payment from a case.
 */
export async function unlinkPayment(paymentId: string) {
  const supabase = await createSupabaseServerClient()

  const { data: payment } = await supabase
    .from('inmigration_payments')
    .select('case_id')
    .eq('id', paymentId)
    .single()

  const { error } = await supabase
    .from('inmigration_payments')
    .update({ case_id: null })
    .eq('id', paymentId)

  if (error) {
    console.error('Error unlinking payment:', error.message)
    return { error: error.message }
  }

  revalidatePath('/inmigration-services')
  if (payment?.case_id) {
    revalidatePath(`/inmigration-services/${payment.case_id}`)
  }
  revalidatePath('/payments')
  return { data: 'success' }
}
