// app/(app)/loans/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Loan, LoanFormValues } from '@/lib/loans.types'

/*
|-------------------------------------------------------------------------
| Data Mapping
|-------------------------------------------------------------------------
*/

// Maps database row (snake_case) to application type (camelCase)
function mapLoanFromDb(row: any): Loan {
  return {
    id: row.id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    clientEmail: row.client_email,
    clientAddress: row.client_address,
    loanDate: row.loan_date,
    amount: Number(row.amount), // Ensure numeric type from DB
    interestRate: Number(row.interest_rate), // Ensure numeric type from DB
    frequency: row.frequency,
    status: row.status,
    notes: row.notes,
  }
}

/*
|-------------------------------------------------------------------------
| Server Actions
|-------------------------------------------------------------------------
*/

/**
 * Fetches all loans from the database, ordered by date descending.
 */
export async function getLoans(): Promise<Loan[]> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('loan_date', { ascending: false })

  if (error) {
    console.error('Error fetching loans:', error.message)
    return []
  }

  return (data || []).map(mapLoanFromDb)
}

/**
 * Adds or updates a loan in the database.
 */
export async function upsertLoan(
  formData: LoanFormValues
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()
  const isEditing = !!formData.id

  // Map form data to DB columns
  const payload = {
    client_name: formData.clientName,
    client_phone: formData.clientPhone || null,
    client_email: formData.clientEmail || null,
    client_address: formData.clientAddress || null,
    loan_date: formData.loanDate,
    amount: formData.amount,
    interest_rate: formData.interestRate,
    frequency: formData.frequency,
    status: formData.status,
    notes: formData.notes || null,
  }

  try {
    if (isEditing) {
      // Update existing loan
      const { error } = await supabase
        .from('loans')
        .update(payload)
        .eq('id', formData.id)

      if (error) throw error
    } else {
      // Create new loan
      const { error } = await supabase
        .from('loans')
        .insert(payload)

      if (error) throw error
    }

    revalidatePath('/loans')
    return { success: true }
  } catch (error: any) {
    console.error('Error upserting loan:', error)
    return { success: false, error: error.message || 'Database error' }
  }
}

/**
 * Deletes a loan from the database.
 */
export async function deleteLoan(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient()

  try {
    // Delete loan
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', id)

    if (error) throw error

    revalidatePath('/loans')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting loan:', error)
    return { success: false, error: error.message || 'Database error' }
  }
}