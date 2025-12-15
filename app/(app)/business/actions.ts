// app/(app)/business/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { BusinessSimExpense } from '@/lib/business.types';

// Helper function to get the current user ID
async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('Authentication error in business sim actions:', error?.message);
    return null;
  }
  return user.id;
}

/**
 * Fetches all business simulation expenses for the logged-in user.
 * Ordered by expense type (one_time first), then by creation date (newest first).
 */
export async function getSimExpenses(): Promise<BusinessSimExpense[]> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    console.log('getSimExpenses: User not authenticated.');
    return [];
  }

  const { data, error } = await supabase
    .from('business_sim_expenses')
    .select('*')
    .eq('user_id', userId)
    .order('expense_type', { ascending: true }) // one_time before recurring
    .order('created_at', { ascending: false }); // newest first within type

  if (error) {
    console.error('Error fetching business sim expenses:', error.message);
    return [];
  }

  return (data as BusinessSimExpense[]) || [];
}

/**
 * Adds a new business simulation expense for the logged-in user.
 */
export async function addSimExpense(payload: {
  description: string;
  category: string | null;
  amount: number;
  expense_type: 'one_time' | 'recurring';
  notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Basic validation
  if (!payload.description || payload.amount == null || payload.amount < 0 || !payload.expense_type) {
    return { success: false, error: 'Description, a non-negative amount, and expense type are required.' };
  }
  if (payload.expense_type !== 'one_time' && payload.expense_type !== 'recurring') {
    return { success: false, error: 'Invalid expense type provided.' };
  }

  try {
    const { error } = await supabase
      .from('business_sim_expenses')
      .insert({
        user_id: userId,
        description: payload.description,
        category: payload.category || null,
        amount: payload.amount,
        expense_type: payload.expense_type,
        notes: payload.notes || null,
        status: 'pending', // Default status
      });

    if (error) {
      console.error('Supabase insert error (business sim):', error);
      throw error;
    }

    revalidatePath('/business'); // Revalidate the business simulation page
    return { success: true };

  } catch (error: any) {
    console.error('Error adding business sim expense:', error.message);
    return { success: false, error: error.message || 'Failed to add simulation expense.' };
  }
}

/**
 * Updates an existing business simulation expense.
 */
export async function updateSimExpense(payload: {
  id: string;
  description: string;
  category: string | null;
  amount: number;
  expense_type: 'one_time' | 'recurring';
  notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id) {
    return { success: false, error: 'Expense ID is required for update.' };
  }
  // Basic validation
  if (!payload.description || payload.amount == null || payload.amount < 0 || !payload.expense_type) {
    return { success: false, error: 'Description, a non-negative amount, and expense type are required.' };
  }
  if (payload.expense_type !== 'one_time' && payload.expense_type !== 'recurring') {
    return { success: false, error: 'Invalid expense type provided.' };
  }

  try {
    const { error } = await supabase
      .from('business_sim_expenses')
      .update({
        description: payload.description,
        category: payload.category || null,
        amount: payload.amount,
        expense_type: payload.expense_type,
        notes: payload.notes || null,
        // updated_at is handled by trigger
      })
      .eq('id', payload.id)
      .eq('user_id', userId); // Ensure user owns the record

    if (error) {
      console.error('Supabase update error (business sim):', error);
      throw error;
    }

    revalidatePath('/business');
    return { success: true };

  } catch (error: any) {
    console.error('Error updating business sim expense:', error.message);
    return { success: false, error: error.message || 'Failed to update simulation expense.' };
  }
}

/**
 * Updates the status ('pending' or 'paid') of a specific business simulation expense.
 */
export async function updateSimExpenseStatus(payload: {
  id: string;
  status: 'pending' | 'paid';
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id || !payload.status) {
    return { success: false, error: 'Expense ID and status are required.' };
  }
  if (payload.status !== 'pending' && payload.status !== 'paid') {
    return { success: false, error: 'Invalid status provided.' };
  }

  try {
    const { error } = await supabase
      .from('business_sim_expenses')
      .update({
        status: payload.status,
        // updated_at is handled by trigger
      })
      .eq('id', payload.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase status update error (business sim):', error);
      throw error;
    }

    revalidatePath('/business');
    return { success: true };

  } catch (error: any) {
    console.error('Error updating business sim expense status:', error.message);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}

/**
 * Deletes a specific business simulation expense for the logged-in user.
 */
export async function deleteSimExpense(payload: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id) {
    return { success: false, error: 'Expense ID is required for deletion.' };
  }

  try {
    const { error } = await supabase
      .from('business_sim_expenses')
      .delete()
      .eq('id', payload.id)
      .eq('user_id', userId); // RLS also enforces this

    if (error) {
      console.error('Supabase delete error (business sim):', error);
      throw error;
    }

    revalidatePath('/business');
    return { success: true };

  } catch (error: any) {
    console.error('Error deleting business sim expense:', error.message);
    return { success: false, error: error.message || 'Failed to delete simulation expense.' };
  }
}