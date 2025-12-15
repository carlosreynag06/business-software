'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  WeekItem,
  OneTimeEntry,
  Rule,
  Override,
} from '@/lib/types';
import {
  format as formatDateFns,
  addDays,
  startOfDay,
  startOfMonth,
  endOfMonth,
  endOfDay,
} from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { computeSnapshot } from '@/lib/BudgetLogic';
// We import from the Agenda module, as Calendar is now Agenda
import { listEventsInRange } from '@/app/(app)/agenda/actions';

const NY_TZ = 'America/New_York';

// --- Helper: Format Time ---
function formatTime(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    const zonedDate = toZonedTime(isoString, NY_TZ);
    return formatTz(zonedDate, 'h:mm a', { timeZone: NY_TZ });
  } catch (e) {
    console.error('Error formatting time:', e);
    return null;
  }
}

// --- Helper: Get Authenticated User ID ---
async function getUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    console.error('Authentication error in personal dashboard actions:', error?.message);
    return null;
  }
  return user.id;
}

// --- Helper to fetch all raw budget data ---
async function getAllBudgetData(
  userId: string
): Promise<{ entries: OneTimeEntry[]; rules: Rule[]; overrides: Override[] }> {
  const supabase = await createSupabaseServerClient();
  const [entriesRes, rulesRes, overridesRes] = await Promise.all([
    supabase.from('budget_entries').select('*').eq('user_id', userId),
    supabase.from('budget_rules').select('*').eq('user_id', userId),
    supabase.from('budget_rule_overrides').select('*').eq('user_id', userId),
  ]);

  return {
    entries: (entriesRes.data as OneTimeEntry[]) ?? [],
    rules: (rulesRes.data as Rule[]) ?? [],
    overrides: (overridesRes.data as Override[]) ?? [],
  };
}

// --- Personal Dashboard Data Types ---
// Cleaned up to remove Shopping/Checklist data
export type PersonalDashboardKpiData = {
  billsDueToday: number;
  overdueBills: number;
};

/**
 * Fetches aggregated KPI data for the Personal Dashboard.
 * Focuses on Budget (Overdue/Due Today) stats.
 */
export async function getPersonalDashboardKpiData(): Promise<PersonalDashboardKpiData> {
  const userId = await getUserId();

  const defaultKpis = {
    billsDueToday: 0,
    overdueBills: 0,
  };

  if (!userId) {
    return defaultKpis;
  }

  try {
    // Fetch Budget KPIs
    const today = new Date();
    const today_local = formatDateFns(today, 'yyyy-MM-dd');
    const month_start = formatDateFns(startOfMonth(today), 'yyyy-MM-dd');
    const month_end = formatDateFns(endOfMonth(today), 'yyyy-MM-dd');

    const { entries, rules, overrides } = await getAllBudgetData(userId);

    const snapshot = computeSnapshot({
      entries,
      rules,
      overrides,
      month_start,
      month_end,
      today_local,
    });

    const overdueBills = snapshot.rows.filter(
      (r) => r.type === 'expense' && !r.is_paid && r.effective_date < today_local
    ).length;

    const billsDueToday = snapshot.rows.filter(
      (r) =>
        r.effective_date === today_local &&
        r.type === 'expense' &&
        !r.is_paid
    ).length;

    return {
      billsDueToday,
      overdueBills,
    };
  } catch (error: any) {
    console.error('Error fetching personal dashboard KPI data:', error.message);
    return defaultKpis;
  }
}

/**
 * Fetches items for the "This Week at a Glance" grid from Budget and Calendar (Agenda).
 */
export async function getPersonalWeekItems(): Promise<WeekItem[]> {
  const userId = await getUserId();

  if (!userId) {
    return [];
  }

  // Define the date range: Today to Today + 6 days
  const today = new Date();
  const today_local = formatDateFns(today, 'yyyy-MM-dd');
  const weekStart = startOfDay(today);
  const weekEnd = endOfDay(addDays(weekStart, 6)); // 7 days total, inclusive

  const weekStartISO = formatDateFns(weekStart, 'yyyy-MM-dd');
  const weekEndISO = formatDateFns(weekEnd, 'yyyy-MM-dd');

  try {
    // --- 1. Fetch Budget Items for the week ---
    const { entries, rules, overrides } = await getAllBudgetData(userId);
    const budgetSnapshot = computeSnapshot({
      entries,
      rules,
      overrides,
      month_start: weekStartISO,
      month_end: weekEndISO,
      today_local: today_local,
    });

    const budgetItems: WeekItem[] = budgetSnapshot.rows
      .filter((r) => r.type === 'expense' && !r.is_paid) // Only show unpaid expenses
      .map((r) => ({
        id: (r.occurrence_id || r.id) as string,
        dateISO: r.effective_date,
        title: r.description,
        source: 'budget',
        amount: r.amount,
        startTime: null,
        endTime: null,
        category: null,
        location: null,
        notes: null,
      }));

    // --- 2. Fetch Calendar Events/Tasks for the week ---
    const startLocalISO = formatTz(weekStart, "yyyy-MM-dd'T'00:00:00", { timeZone: NY_TZ });
    const endLocalISO = formatTz(addDays(weekEnd, 1), "yyyy-MM-dd'T'00:00:00", { timeZone: NY_TZ });

    const calendarEvents = await listEventsInRange(startLocalISO, endLocalISO);

    const calendarItems: WeekItem[] = calendarEvents.map(
      (e) => ({
        id: e.id,
        dateISO: formatTz(toZonedTime(e.start_ts, NY_TZ), 'yyyy-MM-dd', { timeZone: NY_TZ }),
        title: e.title,
        source: 'calendar',
        startTime: formatTime(e.start_ts),
        endTime: formatTime(e.end_ts),
        category: e.category,
        location: (e as any).location ?? null,
        notes: (e as any).notes ?? null,
        amount: undefined,
      })
    );

    // --- 3. Combine and Sort ---
    const allItems = [...budgetItems, ...calendarItems];
    
    allItems.sort((a, b) => {
      const dateCompare = a.dateISO.localeCompare(b.dateISO);
      if (dateCompare !== 0) return dateCompare;

      // Basic time comparison (put items with start times earlier)
      const timeA = a.startTime ? 1 : 0;
      const timeB = b.startTime ? 1 : 0;
      if (timeA !== timeB) return timeB - timeA;

      return a.title.localeCompare(b.title);
    });

    return allItems;
  } catch (error: any) {
    console.error('Error fetching personal week items:', error.message);
    return [];
  }
}