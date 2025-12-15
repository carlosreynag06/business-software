// app/(app)/crm-pipeline/actions.ts
'use server'

import type { Lead, Contact, MarketingChannel, ServiceType } from '@/lib/types'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// ---------- Supabase (Next 15: cookies() is async) ----------
async function getSupabase() {
  const cookieStore = await cookies()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        // Supabase SSR expects this signature; emulate removal via set
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}

// ---------- Mappers ----------
function mapContact(row: any): Contact {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    createdAt: row.created_at,
  }
}

function mapLeadFromView(row: any): Lead {
  // This maps a flat row from lead_details_v
  // (lead_id, contact_id, name, email, phone, service_type, ...)
  // to the nested Lead type
  const expected = row.expected_value != null ? Number(row.expected_value) : undefined
  return {
    id: row.lead_id, // map lead_id to id
    contactId: row.contact_id,
    serviceType: row.service_type as ServiceType,
    sourceChannel: row.source_channel as MarketingChannel,
    expectedValue: expected,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    contact: {
      id: row.contact_id,
      fullName: row.name,
      email: row.email ?? undefined,
      phone: row.phone ?? undefined,
      createdAt: row.created_at, // Use lead's created_at for contact
    },
  }
}

// ---------- READ (Replaces getPipelineData) ----------
export async function getLeads(params: {
  q?: string
  date_from?: string
  date_to?: string
  service?: ServiceType[]
  source?: MarketingChannel[]
}): Promise<Lead[]> {
  const supabase = await getSupabase()
  let query = supabase.from('lead_details_v').select('*')

  if (params.q) {
    // Search name, email, or phone
    query = query.or(
      `name.ilike.%${params.q}%,email.ilike.%${params.q}%,phone.ilike.%${params.q}%`,
    )
  }
  if (params.date_from) {
    query = query.gte('created_at', params.date_from)
  }
  if (params.date_to) {
    query = query.lte('created_at', params.date_to)
  }
  if (params.service && params.service.length > 0) {
    query = query.in('service_type', params.service)
  }
  if (params.source && params.source.length > 0) {
    query = query.in('source_channel', params.source)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map(mapLeadFromView)
}

// ---------- CREATE (contact → lead) ----------
export async function createLeadWithContact(input: {
  fullName: string
  email?: string
  phone?: string
  serviceType: ServiceType
  sourceChannel: MarketingChannel
  expectedValue?: number | null
  notes?: string | null
}): Promise<Lead> {
  const supabase = await getSupabase()

  // 1. Insert Contact (simplified)
  const { data: contact, error: cErr } = await supabase
    .from('contacts')
    .insert({
      full_name: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
    })
    .select('id, full_name, email, phone, created_at')
    .single()
  if (cErr) throw new Error(cErr.message)

  // 2. Insert Lead (simplified)
  const { data: lead, error: lErr } = await supabase
    .from('leads')
    .insert({
      contact_id: contact.id,
      service_type: input.serviceType,
      source_channel: input.sourceChannel,
      expected_value: input.expectedValue ?? 0,
      notes: input.notes ?? null,
    })
    .select('id')
    .single()
  if (lErr) throw new Error(lErr.message)

  // 3. Select from the view to return the full row
  const { data: newLeadRow, error: vErr } = await supabase
    .from('lead_details_v')
    .select('*')
    .eq('lead_id', lead.id)
    .single()
  if (vErr) throw new Error(vErr.message)

  return mapLeadFromView(newLeadRow)
}

// ---------- UPDATE (lead + optional contact) ----------
export async function updateLeadAndContact(input: {
  id: string // lead id
  serviceType: ServiceType
  sourceChannel: MarketingChannel
  expectedValue?: number | null
  notes?: string | null
  contact?: {
    id: string // contact id
    fullName: string
    email?: string | null
    phone?: string | null
  }
}): Promise<Lead> {
  const supabase = await getSupabase()

  // 1. Update Contact (if provided)
  if (input.contact) {
    const { error: cErr } = await supabase
      .from('contacts')
      .update({
        full_name: input.contact.fullName,
        email: input.contact.email ?? null,
        phone: input.contact.phone ?? null,
      })
      .eq('id', input.contact.id)
    if (cErr) throw new Error(cErr.message)
  }

  // 2. Update Lead
  const { error: lErr } = await supabase
    .from('leads')
    .update({
      service_type: input.serviceType,
      source_channel: input.sourceChannel,
      expected_value: input.expectedValue ?? 0,
      notes: input.notes ?? null,
    })
    .eq('id', input.id)
  if (lErr) throw new Error(lErr.message)

  // 3. Select from the view to return the full row
  const { data: updatedLeadRow, error: vErr } = await supabase
    .from('lead_details_v')
    .select('*')
    .eq('lead_id', input.id)
    .single()
  if (vErr) throw new Error(vErr.message)

  return mapLeadFromView(updatedLeadRow)
}

// ---------- DELETE ----------
export async function deleteLead(id: string): Promise<{ id: string }> {
  const supabase = await getSupabase()
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
  return { id }
}
