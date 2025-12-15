// app/(app)/crypto/actions.ts
'use server'

import {
  CryptoTransaction,
  MonthSummary,
} from '@/lib/crypto.types' // Types are now USD-based
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

/*
|--------------------------------------------------------------------------
| Supabase Helper
|--------------------------------------------------------------------------
*/
async function getSupabaseWithUser() {
  const cookieStore = cookies()
  const supabase = await createSupabaseServerClient(cookieStore)
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    throw new Error('User not authenticated')
  }
  return { supabase, user }
}

/*
|--------------------------------------------------------------------------
| Data Fetching Actions (Live)
|--------------------------------------------------------------------------
*/

/**
 * Fetches all live data needed for the Crypto module from Supabase.
 */
export async function getCryptoData(): Promise<{
  initialCapital: number
  monthHistory: MonthSummary[]
  transactions: CryptoTransaction[]
}> {
  const { supabase, user } = await getSupabaseWithUser()

  const [settingsResult, transactionsResult, summariesResult] =
    await Promise.all([
      // 1. Fetch settings
      supabase
        .from('crypto_settings')
        .select('initial_capital_usd') // CHANGED
        .eq('user_id', user.id)
        .single(),
      // 2. Fetch transactions
      supabase
        .from('crypto_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false }),
      // 3. Fetch month summaries
      supabase
        .from('crypto_month_summaries')
        .select('*')
        .eq('user_id', user.id)
        .order('month', { ascending: true }),
    ])

  // Handle errors
  if (settingsResult.error && settingsResult.status !== 406) {
    // 406 = no row, which is fine, we use default
    console.error('Error fetching settings:', settingsResult.error)
  }
  if (transactionsResult.error) {
    console.error('Error fetching transactions:', transactionsResult.error)
  }
  if (summariesResult.error) {
    console.error('Error fetching summaries:', summariesResult.error)
  }

  // Map DB snake_case to frontend camelCase
  const initialCapital = settingsResult.data?.initial_capital_usd ?? 0 // CHANGED

  const transactions: CryptoTransaction[] = (
    transactionsResult.data || []
  ).map((tx) => ({
    id: tx.id,
    date: tx.occurred_at,
    type: tx.tx_type,
    asset: tx.asset,
    amount: tx.amount,
    unitPriceUsd: tx.unit_price_usd, // CHANGED
    totalUsd: tx.total_usd, // CHANGED
    feeAmount: tx.fee_amount,
    feeCurrency: tx.fee_currency,
    client: tx.client,
    phone: tx.phone,
    city: tx.city,
    notes: tx.notes,
  }))

  const monthHistory: MonthSummary[] = (
    summariesResult.data || []
  ).map((s) => ({
    month: s.month,
    capitalBase: s.capital_base_usd, // CHANGED
    portfolioValueAtClose: s.portfolio_value_at_close_usd, // CHANGED
    fees: s.fees_usd, // CHANGED
    marketing: s.marketing_usd, // CHANGED
    net: s.net_usd, // CHANGED
  }))

  return {
    initialCapital,
    monthHistory,
    transactions,
  }
}

/*
|--------------------------------------------------------------------------
| Data Mutation Actions (Live)
|--------------------------------------------------------------------------
*/

/**
 * Creates a new transaction in the database.
 */
export async function createTransaction(
  tx: Omit<CryptoTransaction, 'id'>
): Promise<{ success: boolean; data?: CryptoTransaction; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()

  const { error } = await supabase.from('crypto_transactions').insert({
    user_id: user.id,
    occurred_at: tx.date,
    tx_type: tx.type,
    asset: tx.asset,
    amount: tx.amount,
    unit_price_usd: tx.unitPriceUsd, // CHANGED
    total_usd: tx.totalUsd, // CHANGED
    fee_amount: tx.feeAmount,
    fee_currency: tx.feeCurrency,
    client: tx.client,
    phone: tx.phone,
    city: tx.city,
    notes: tx.notes,
  })

  if (error) {
    console.error('Error creating transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(app)/crypto')
  return { success: true }
}

/**
 * Updates an existing transaction in the database.
 */
export async function updateTransaction(
  tx: CryptoTransaction
): Promise<{ success: boolean; data?: CryptoTransaction; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('crypto_transactions')
    .update({
      occurred_at: tx.date,
      tx_type: tx.type,
      asset: tx.asset,
      amount: tx.amount,
      unit_price_usd: tx.unitPriceUsd, // CHANGED
      total_usd: tx.totalUsd, // CHANGED
      fee_amount: tx.feeAmount,
      fee_currency: tx.feeCurrency,
      client: tx.client,
      phone: tx.phone,
      city: tx.city,
      notes: tx.notes,
    })
    .eq('id', tx.id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(app)/crypto')
  return { success: true }
}

/**
 * Deletes a transaction from the database.
 */
export async function deleteTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('crypto_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting transaction:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(app)/crypto')
  return { success: true }
}

/**
 * Updates the user's global initial capital.
 */
export async function updateInitialCapital(
  newAmount: number
): Promise<{ success: boolean; data?: number; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('crypto_settings')
    .upsert(
      { user_id: user.id, initial_capital_usd: newAmount }, // CHANGED
      { onConflict: 'user_id' }
    )

  if (error) {
    console.error('Error updating initial capital:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(app)/crypto')
  return { success: true, data: newAmount }
}

/**
 * Saves a "closed month" summary to the database.
 */
export async function addMonthSummaryEntry(
  summary: MonthSummary
): Promise<{ success: boolean; data?: MonthSummary; error?: string }> {
  const { supabase, user } = await getSupabaseWithUser()

  const { error } = await supabase
    .from('crypto_month_summaries')
    .upsert(
      {
        user_id: user.id,
        month: summary.month,
        capital_base_usd: summary.capitalBase, // CHANGED
        portfolio_value_at_close_usd: summary.portfolioValueAtClose, // CHANGED
        fees_usd: summary.fees, // CHANGED
        marketing_usd: summary.marketing, // CHANGED
        net_usd: summary.net, // CHANGED
      },
      { onConflict: 'user_id, month' }
    )

  if (error) {
    console.error('Error saving month summary:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/(app)/crypto')
  return { success: true, data: summary }
}