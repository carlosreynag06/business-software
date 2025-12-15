'use server'

import { revalidatePath } from 'next/cache'
import type { RealEstateDeal, RealEstateFormValues } from '@/lib/real-estate.types'
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server'

const REAL_ESTATE_PATH = '/(app)/real-estate'

// --- Utility Types ---

export type RealEstateActionResult = {
  success: boolean
  data?: RealEstateDeal | null
  error?: string | null
}

export type RealEstateDeleteResult = {
  success: boolean
  error?: string | null
}

// --- Data Mapping Utilities ---

function mapDealFromDb(row: any): RealEstateDeal {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    clientType: row.client_type,
    date: row.deal_date,
    propertyAddress: row.property_address,
    propertyValue: row.property_value,
    commissionPercent: row.commission_percent,
    status: row.status,
    notes: row.notes,
  }
}

function mapDealToDb(deal: RealEstateFormValues | RealEstateDeal) {
  return {
    client_name: deal.clientName,
    client_phone: deal.clientPhone,
    client_email: deal.clientEmail,
    client_type: deal.clientType,
    deal_date: deal.date,
    property_address: deal.propertyAddress,
    property_value: deal.propertyValue,
    commission_percent: deal.commissionPercent,
    status: deal.status,
    notes: deal.notes,
  }
}

/*
|───────────────────────────────
| Database Helpers (Supabase CRUD)
|───────────────────────────────
*/

export async function getRealEstateDeals(): Promise<RealEstateDeal[]> {
  // FIX: Added 'await' here
  const supabase = await createClient()

  const { data: deals, error } = await supabase
    .from('real_estate_deals')
    .select('*')
    .order('deal_date', { ascending: false })

  if (error) {
    console.error('Error fetching real estate deals:', error.message)
    return []
  }

  return deals.map(mapDealFromDb)
}

export async function createRealEstateDeal(
  input: RealEstateFormValues | RealEstateDeal,
): Promise<RealEstateActionResult> {
  // FIX: Added 'await' here
  const supabase = await createClient()
  const payload = mapDealToDb(input)

  try {
    const { data, error } = await supabase
      .from('real_estate_deals')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Supabase Insert Error:', error.message)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to create real estate record.',
      }
    }

    revalidatePath(REAL_ESTATE_PATH)
    const newDeal = mapDealFromDb(data)
    return { success: true, data: newDeal }
  } catch (error: any) {
    console.error('Error creating real estate deal:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to create real estate record.',
    }
  }
}

export async function updateRealEstateDeal(
  input: RealEstateFormValues | RealEstateDeal,
): Promise<RealEstateActionResult> {
  // FIX: Added 'await' here
  const supabase = await createClient()

  if (!input.id) {
    return {
      success: false,
      data: null,
      error: 'Missing ID for real estate record update.',
    }
  }

  const payload = mapDealToDb(input)

  try {
    const { data, error } = await supabase
      .from('real_estate_deals')
      .update(payload)
      .eq('id', input.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase Update Error:', error.message)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to update real estate record.',
      }
    }

    revalidatePath(REAL_ESTATE_PATH)
    const updatedDeal = mapDealFromDb(data)
    return { success: true, data: updatedDeal }
  } catch (error: any) {
    console.error('Error updating real estate deal:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to update real estate record.',
    }
  }
}

export async function deleteRealEstateDeal(
  id: string,
): Promise<RealEstateDeleteResult> {
  // FIX: Added 'await' here
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('real_estate_deals')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase Delete Error:', error.message)
      return {
        success: false,
        error: error.message || 'Failed to delete real estate record.',
      }
    }

    revalidatePath(REAL_ESTATE_PATH)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting real estate deal:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete real estate record.',
    }
  }
}

export async function markRealEstateSold(
  id: string,
): Promise<RealEstateActionResult> {
  // FIX: Added 'await' here
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('real_estate_deals')
      .update({ status: 'sold' })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase Mark Sold Error:', error.message)
      return {
        success: false,
        data: null,
        error: error.message || 'Failed to mark property as sold.',
      }
    }

    revalidatePath(REAL_ESTATE_PATH)
    const updatedDeal = mapDealFromDb(data)
    return { success: true, data: updatedDeal }
  } catch (error: any) {
    console.error('Error marking real estate deal as sold:', error)
    return {
      success: false,
      data: null,
      error: error.message || 'Failed to mark property as sold.',
    }
  }
}