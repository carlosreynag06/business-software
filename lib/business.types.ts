// lib/business.types.ts

/**
 * Represents a single expense in the Business Simulation module.
 * Maps to the Supabase table `business_sim_expenses`.
 */
export interface BusinessSimExpense {
  id: string; // uuid
  user_id: string; // uuid
  description: string; // text
  category: string | null; // text
  amount: number; // numeric
  expense_type: 'one_time' | 'recurring'; // sim_expense_type enum
  notes: string | null; // text
  status: 'pending' | 'paid'; // planning_status enum
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}