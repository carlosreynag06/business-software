// app/(app)/payments/actions.ts
'use server'

import type {
  Payment,
  Lead,
  ClassPackage,
  ClassStudent,
  PaymentMethod,
  Project,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/*
|--------------------------------------------------------------------------|
| Server Actions                                                           |
|--------------------------------------------------------------------------|
*/

/**
 * Fetches all data needed for the payments page.
 * Returns payments, plus leads, students, and projects for linking.
 * - DOP-only amounts (amount_dop_cents)
 * - Projects provide { id, name, client_name, type } for the dropdown label
 */
export async function getPaymentData(): Promise<{
  payments: Payment[]
  leads: Lead[]
  students: ClassStudent[]
  projects: Project[]
} | null> {
  const supabase = await createSupabaseServerClient()

  const [paymentsRes, leadsRes, studentsRes, projectsRes] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .order('date_received', { ascending: false }),
    supabase.from('leads').select(
      `
      *,
      contact:contacts!inner(*)
    `
    ),
    supabase.from('class_students').select(
      `
      *,
      contact:contacts!inner(*)
    `
    ),
    supabase.from('projects').select(
      `
      id,
      name,
      type,
      client_name
    `
    ),
  ])

  if (paymentsRes.error || leadsRes.error || studentsRes.error || projectsRes.error) {
    console.error(
      'Error fetching payment data:',
      paymentsRes.error || leadsRes.error || studentsRes.error || projectsRes.error
    )
    return null
  }

  // Map Payments -> camelCase (DOP-only)
  const payments: Payment[] = (paymentsRes.data || []).map((p: any): Payment => ({
    id: p.id,
    leadId: p.lead_id,
    studentId: p.student_id,
    classPackageId: p.class_package_id, // legacy-safe
    projectId: p.project_id,
    amountDopCents: p.amount_dop_cents,
    method: p.method,
    dateReceived: p.date_received,
    memo: p.memo,
  }))

  // Map Leads -> camelCase with nested contact
  const leads: Lead[] = (leadsRes.data || []).map((l: any): Lead => ({
    id: l.id,
    contactId: l.contact_id,
    serviceType: l.service_type,
    sourceChannel: l.source_channel,
    utmSource: l.utm_source,
    utmMedium: l.utm_medium,
    utmCampaign: l.utm_campaign,
    notes: l.notes,
    currentStage: l.current_stage,
    stageTs: l.stage_ts,
    expectedValue: l.expected_value,
    serviceMeta: l.service_meta,
    createdAt: l.created_at,
    contact: {
      id: l.contact.id,
      fullName: l.contact.full_name,
      email: l.contact.email,
      phone: l.contact.phone,
      phoneE164: l.contact.phone_e164,
      whatsapp: l.contact.whatsapp,
      preferredChannel: l.contact.preferred_channel,
      referralSourceText: l.contact.referral_source_text,
      referralContactId: l.contact.referral_contact_id,
      locationCity: l.contact.location_city,
      locationCountry: l.contact.location_country,
      tags: l.contact.tags,
      notes: l.contact.notes,
      createdAt: l.contact.created_at,
    },
  }))

  // Map Students -> camelCase with nested contact
  const students: ClassStudent[] = (studentsRes.data || []).map(
    (s: any): ClassStudent => ({
      id: s.id,
      contactId: s.contact_id,
      language: s.language,
      level: s.level,
      goals: s.goals,
      status: s.status,
      contact: {
        id: s.contact.id,
        fullName: s.contact.full_name,
        email: s.contact.email,
        phone: s.contact.phone,
        phoneE164: s.contact.phone_e164,
        whatsapp: s.contact.whatsapp,
        preferredChannel: s.contact.preferred_channel,
        referralSourceText: s.contact.referral_source_text,
        referralContactId: s.contact.referral_contact_id,
        locationCity: s.contact.location_city,
        locationCountry: s.contact.location_country,
        tags: s.contact.tags,
        notes: s.contact.notes,
        createdAt: s.contact.created_at,
      },
    })
  )

  // Map Projects -> camelCase (partial for dropdown; fill required fields for type safety)
  const projects: Project[] = (projectsRes.data || []).map((p: any): Project => ({
    id: p.id,
    name: p.name,
    type: p.type,
    clientName: p.client_name,
    // satisfy broader Project type if it includes budget/paid cents
    budgetDopCents: (0 as unknown) as number,
    amountPaidDopCents: (0 as unknown) as number,
  }))

  return { payments, leads, students, projects }
}

// Contract used by the client form when submitting
type PaymentFormData = {
  id?: string
  amountDopCents: number
  dateReceived: string
  method: PaymentMethod
  memo?: string
  leadId?: string | null
  studentId?: string | null
  projectId?: string | null
}

/**
 * Upsert a payment (DOP-only). If projectId is provided, link to the project
 * and clear lead/student per single-link rule. Revalidates pages that surface totals.
 */
export async function upsertPayment(
  formData: PaymentFormData
): Promise<{ success: boolean; error?: string; data?: Payment }> {
  const supabase = await createSupabaseServerClient()
  const isEditing = !!formData.id

  // Single-link rule: prefer project > student > lead
  let lead_id = formData.leadId || null
  let student_id = formData.studentId || null
  let project_id = formData.projectId || null

  if (project_id) {
    lead_id = null
    student_id = null
  } else if (student_id) {
    lead_id = null
  }

  // DOP-only payload (snake_case for DB)
  const payload = {
    lead_id,
    student_id,
    project_id,
    amount_dop_cents: formData.amountDopCents,
    method: formData.method,
    date_received: formData.dateReceived,
    memo: formData.memo,
  }

  if (isEditing) {
    const { data, error } = await supabase
      .from('payments')
      .update(payload)
      .eq('id', formData.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/payments')
    revalidatePath('/classes')
    revalidatePath('/projects') // refresh project totals
    return {
      success: true,
      data: {
        id: data.id,
        leadId: data.lead_id,
        studentId: data.student_id,
        classPackageId: data.class_package_id,
        projectId: data.project_id,
        amountDopCents: data.amount_dop_cents,
        method: data.method,
        dateReceived: data.date_received,
        memo: data.memo,
      },
    }
  } else {
    const { data, error } = await supabase
      .from('payments')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Error creating payment:', error.message)
      return { success: false, error: error.message }
    }

    revalidatePath('/payments')
    revalidatePath('/classes')
    revalidatePath('/projects') // refresh project totals
    return {
      success: true,
      data: {
        id: data.id,
        leadId: data.lead_id,
        studentId: data.student_id,
        classPackageId: data.class_package_id,
        projectId: data.project_id,
        amountDopCents: data.amount_dop_cents,
        method: data.method,
        dateReceived: data.date_received,
        memo: data.memo,
      },
    }
  }
}

/**
 * Delete a payment + revalidate views.
 */
export async function deletePayment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('payments').delete().eq('id', id)

  if (error) {
    console.error('Error deleting payment:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/payments')
  revalidatePath('/classes')
  revalidatePath('/projects') // refresh project totals
  return { success: true }
}
