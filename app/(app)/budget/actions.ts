'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  addDays,
  endOfMonth,
  format,
  getDate,
  parseISO,
  setDate,
  startOfMonth,
} from 'date-fns';
import type { OneTimeEntry, Rule, Override, Category, EntryType, Frequency, Snapshot, UnifiedRow } from '@/lib/types';
import { computeSnapshot } from '@/lib/BudgetLogic';

// Helper functions remain the same
function toDate(dateStr: string) {
  return parseISO(dateStr + 'T00:00:00');
}
function fmt(d: Date) {
  return format(d, 'yyyy-MM-dd');
}
function clampMonthly(base: Date, dom: number) {
  const last = getDate(endOfMonth(base));
  const day = Math.min(dom, last);
  return fmt(setDate(base, day));
}

/* =========================
   READS
   ========================= */

export async function getRawBudgetData(params: { month_start: string; month_end: string }) {
  const supabase = await createSupabaseServerClient();
  const { month_start, month_end } = params;

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('User not found or not authenticated');

  const entriesPromise = supabase
    .from('budget_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_date', month_start)
    .lte('due_date', month_end);

  const rulesPromise = supabase
    .from('budget_rules')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true);

  const overridesPromise = supabase
    .from('budget_rule_overrides')
    .select('*')
    .eq('user_id', user.id)
    .or(
      `and(occurrence_date.gte.${month_start},occurrence_date.lte.${month_end}),and(new_date.gte.${month_start},new_date.lte.${month_end})`
    );

  const [{ data: entriesData, error: e1 }, { data: rulesData, error: e2 }, { data: overridesData, error: e3 }] =
    await Promise.all([entriesPromise, rulesPromise, overridesPromise]);

  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;

  return {
    entries: (entriesData ?? []) as OneTimeEntry[],
    rules: (rulesData ?? []) as Rule[],
    overrides: (overridesData ?? []) as Override[],
  };
}

/**
 * Read wrapper for Dashboard week window.
 * Reuses getRawBudgetData + computeSnapshot and filters to [startISO, endISO).
 * Includes only unpaid rows not postponed outside the window.
 */
export async function getBudgetWeek(params: { startISO: string; endISO: string }): Promise<UnifiedRow[]> {
  const { startISO, endISO } = params;

  // Compute minimal month span that fully covers the requested week.
  // Use the month of startISO and the month of (endISO - 1 day).
  const startDate = parseISO(startISO);
  const endMinusOne = addDays(parseISO(endISO), -1);

  const month_start = fmt(startOfMonth(startDate));
  const month_end = fmt(endOfMonth(endMinusOne));

  // Fetch raw data for that span.
  const raw = await getRawBudgetData({ month_start, month_end });

  // Compute the full snapshot, then filter rows to the requested week.
  const snapshot: Snapshot = computeSnapshot(raw);

  // Date window bounds as YYYY-MM-DD for string compare on effective_date.
  const startDay = fmt(startDate);
  const endDayExclusive = fmt(addDays(endMinusOne, 1)); // exclusive upper bound (day after endMinusOne)

  const inWindowAndUnpaid = snapshot.rows.filter((row) => {
    // unpaid: anything not explicitly 'Paid'
    const isUnpaid = row.status !== 'Paid';

    // effective_date inside [startISO, endISO)
    // All dates are YYYY-MM-DD; string compare works safely here.
    const d = row.effective_date;
    const inWindow = d >= startDay && d < endDayExclusive;

    return isUnpaid && inWindow;
  });

  return inWindowAndUnpaid;
}

/* =========================
   WRITES
   ========================= */

export async function upsertEntry(input: {
  id?: string;
  description: string;
  amount: number;
  type: EntryType;
  category: Category;
  due_date: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('User not found');

  const payload = {
    description: input.description,
    amount: input.amount,
    type: input.type,
    category: input.category,
    due_date: input.due_date,
  };

  if (input.id) {
    const { error } = await supabase.from('budget_entries').update(payload).eq('id', input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('budget_entries')
      .insert({ user_id: user.id, ...payload });
    if (error) throw error;
  }

  revalidatePath('/budget');
  revalidatePath('/');
}

export async function deleteEntry(params: { id: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('budget_entries').delete().eq('id', params.id);
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/');
}

export async function markEntryPaid(params: { id: string; paid_on: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('budget_entries')
    .update({ paid_on: params.paid_on })
    .eq('id', params.id);
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/');
}

export async function postponeEntry(params: { id: string; new_date: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('budget_entries')
    .update({ due_date: params.new_date })
    .eq('id', params.id);
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/');
  return { ok: true };
}

export async function upsertRule(input: {
  id?: string;
  description: string;
  amount: number;
  type: EntryType;
  category: Category;
  frequency: Frequency;
  dom?: number | null;
  dow?: number | null;
  start_anchor: string;
  active?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('User not found');

  const payload = {
    description: input.description,
    amount: input.amount,
    type: input.type,
    category: input.category,
    frequency: input.frequency,
    dom: input.dom ?? null,
    dow: input.dow ?? null,
    start_anchor: input.start_anchor,
    active: input.active ?? true,
  };

  if (input.id) {
    const { error } = await supabase.from('budget_rules').update(payload).eq('id', input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('budget_rules')
      .insert({ user_id: user.id, ...payload });
    if (error) throw error;
  }

  revalidatePath('/budget');
  revalidatePath('/');
}

export async function deleteRule(params: { id: string }) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('budget_rules').delete().eq('id', params.id);
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/');
}

export async function markOccurrencePaid(params: {
  rule_id: string;
  occurrence_date: string;
  paid_on: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('User not found');

  const { error } = await supabase.from('budget_rule_overrides').upsert(
    {
      user_id: user.id,
      rule_id: params.rule_id,
      occurrence_date: params.occurrence_date,
      override_type: 'paid',
      paid_on: params.paid_on,
      new_date: null,
    },
    { onConflict: 'user_id,rule_id,occurrence_date' }
  );
  if (error) throw error;

  revalidatePath('/budget');
  revalidatePath('/');
}

export async function postponeOccurrence(params: {
  rule_id: string;
  occurrence_date: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('User not found');

  const { data: rule, error: rErr } = await supabase
    .from('budget_rules')
    .select('*')
    .eq('id', params.rule_id)
    .single();
  if (rErr) throw rErr;

  if (!rule) {
    revalidatePath('/budget');
    revalidatePath('/');
    return { ok: true };
  }

  const r = rule as Rule;

  function nextMonthly(fromISO: string) {
    const occ = toDate(fromISO);
    const firstNextMonth = startOfMonth(addDays(endOfMonth(occ), 1));
    const dom = r.dom ?? getDate(occ);
    return clampMonthly(firstNextMonth, dom);
  }

  let nextDate: string | null = null;
  if (r.frequency === 'weekly') {
    nextDate = fmt(addDays(parseISO(params.occurrence_date), 7));
  } else if (r.frequency === 'biweekly') {
    nextDate = fmt(addDays(parseISO(params.occurrence_date), 14));
  } else if (r.frequency === 'monthly') {
    nextDate = nextMonthly(params.occurrence_date);
  }

  if (nextDate) {
    const { error } = await supabase.from('budget_rule_overrides').upsert(
      {
        user_id: user.id,
        rule_id: params.rule_id,
        occurrence_date: params.occurrence_date,
        override_type: 'postponed',
        new_date: nextDate,
        paid_on: null,
      },
      { onConflict: 'user_id,rule_id,occurrence_date' }
    );
    if (error) throw error;
  }

  revalidatePath('/budget');
  revalidatePath('/');
  return { ok: true };
}