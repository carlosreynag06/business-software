'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Define the type matching the Supabase post_move_items table
export interface ShoppingItem {
  id: string; // uuid
  user_id: string; // uuid
  description: string; // text
  category: string | null; // text
  estimated_cost: number | null; // numeric
  status: 'to_buy' | 'bought'; // shopping_item_status enum
  notes: string | null; // text
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

// Helper function to get the current user ID
async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.error('Authentication error in shopping actions:', error?.message);
    return null;
  }
  return user.id;
}

/**
 * Fetches all shopping items for the logged-in user.
 * Ordered by creation date (newest first).
 */
export async function getShoppingItems(): Promise<ShoppingItem[]> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    console.log('getShoppingItems: User not authenticated.');
    return [];
  }

  const { data, error } = await supabase
    .from('post_move_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shopping items:', error.message);
    return [];
  }

  return (data as ShoppingItem[]) || [];
}

/**
 * Adds a new shopping item for the logged-in user.
 */
export async function addShoppingItem(payload: {
  description: string;
  category: string | null;
  estimated_cost: number | null;
  notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }

  // Basic validation
  if (!payload.description) {
    return { success: false, error: 'Description is required.' };
  }
  if (payload.estimated_cost != null && payload.estimated_cost < 0) {
    return { success: false, error: 'Estimated cost cannot be negative.' };
  }

  try {
    const { error } = await supabase
      .from('post_move_items')
      .insert({
        user_id: userId,
        description: payload.description,
        category: payload.category || null,
        estimated_cost: payload.estimated_cost, // Allows null
        notes: payload.notes || null,
        status: 'to_buy', // Default status
      });

    if (error) {
      console.error('Supabase insert error (shopping):', error);
      throw error;
    }

    revalidatePath('/shopping');
    return { success: true };

  } catch (error: any) {
    console.error('Error adding shopping item:', error.message);
    return { success: false, error: error.message || 'Failed to add item.' };
  }
}

/**
 * Updates details (description, category, cost, notes) of an existing shopping item.
 */
export async function updateShoppingItemDetails(payload: {
  id: string;
  description: string;
  category: string | null;
  estimated_cost: number | null;
  notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id) {
    return { success: false, error: 'Item ID is required for update.' };
  }

  // Basic validation
  if (!payload.description) {
    return { success: false, error: 'Description is required.' };
  }
  if (payload.estimated_cost != null && payload.estimated_cost < 0) {
    return { success: false, error: 'Estimated cost cannot be negative.' };
  }

  try {
    const { error } = await supabase
      .from('post_move_items')
      .update({
        description: payload.description,
        category: payload.category || null,
        estimated_cost: payload.estimated_cost,
        notes: payload.notes || null,
        // updated_at handled by DB trigger
      })
      .eq('id', payload.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase update error (shopping details):', error);
      throw error;
    }

    revalidatePath('/shopping');
    return { success: true };

  } catch (error: any) {
    console.error('Error updating shopping item details:', error.message);
    return { success: false, error: error.message || 'Failed to update item details.' };
  }
}

/**
 * Updates the status ('to_buy' or 'bought') of a specific shopping item.
 */
export async function updateShoppingItemStatus(payload: {
  id: string;
  status: 'to_buy' | 'bought';
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id || !payload.status) {
    return { success: false, error: 'Item ID and status are required.' };
  }
  if (payload.status !== 'to_buy' && payload.status !== 'bought') {
    return { success: false, error: 'Invalid status provided.' };
  }

  try {
    const { error } = await supabase
      .from('post_move_items')
      .update({
        status: payload.status,
      })
      .eq('id', payload.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase status update error (shopping):', error);
      throw error;
    }

    revalidatePath('/shopping');
    return { success: true };

  } catch (error: any) {
    console.error('Error updating shopping item status:', error.message);
    return { success: false, error: error.message || 'Failed to update status.' };
  }
}

/**
 * Deletes a specific shopping item for the logged-in user.
 */
export async function deleteShoppingItem(payload: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const userId = await getUserId();

  if (!userId) {
    return { success: false, error: 'User not authenticated.' };
  }
  if (!payload.id) {
    return { success: false, error: 'Item ID is required for deletion.' };
  }

  try {
    const { error } = await supabase
      .from('post_move_items')
      .delete()
      .eq('id', payload.id)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete error (shopping):', error);
      throw error;
    }

    revalidatePath('/shopping');
    return { success: true };

  } catch (error: any) {
    console.error('Error deleting shopping item:', error.message);
    return { success: false, error: error.message || 'Failed to delete item.' };
  }
}