// lib/BudgetLogic.ts
// Aligned to Personal Software codebase: recurring rules use start_anchor/active/dom,
// overrides use occurrence_date/override_type/new_date/paid_on.
// This file also guarantees:
//  - Every recurring row has a UNIQUE occurrence_id (override id if present; else rule_id+effective_date)
//  - Rows are DE-DUPED by (rule_id,effective_date) for recurring and (id,effective_date) for one-time
//  - Fields present for UI: kind, description, category, amount, type, date, due_date, effective_date,
//    is_paid, is_recurring, rule_id (recurring), occurrence_id (recurring), occurrence_date (recurring)

import {
  addDays,
  addWeeks,
  addMonths,
  isAfter,
  getDaysInMonth,
  parseISO,
  format, // added for YYYY-MM-DD (date-only) formatting
} from 'date-fns';
import type { OneTimeEntry, Rule, Override, UnifiedRow, Totals, Snapshot } from '@/lib/types';

function toUTCDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
}

function clampDay(year: number, monthIndex: number, day: number) {
  const dim = getDaysInMonth(toUTCDate(year, monthIndex, 1));
  return Math.max(1, Math.min(dim, day));
}

function sameDayUTC(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function monthsDiffUTC(a: Date, b: Date) {
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function normalizeInterval(n?: number | null) {
  return !n || n < 1 ? 1 : Math.trunc(n);
}

function inWindow(d: Date, start: Date, end: Date) {
  // inclusive start, exclusive end
  return d.getTime() >= start.getTime() && d.getTime() < end.getTime();
}

/** MONTHLY generator (interval in months, day-of-month respected with clamp) */
export function generateMonthlyDates(
  anchor: Date,
  dayOfMonth: number,
  interval: number,
  windowStart: Date,
  windowEnd: Date
): Date[] {
  const out: Date[] = [];
  const i = normalizeInterval(interval);
  const anchorMonthStart = toUTCDate(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1);
  let cursorMonthStart = toUTCDate(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), 1);

  while (cursorMonthStart < windowEnd) {
    const diff = monthsDiffUTC(anchorMonthStart, cursorMonthStart);
    if (diff >= 0 && diff % i === 0) {
      const y = cursorMonthStart.getUTCFullYear();
      const m = cursorMonthStart.getUTCMonth();
      const d = clampDay(y, m, dayOfMonth);
      const candidate = toUTCDate(y, m, d);
      if (inWindow(candidate, windowStart, windowEnd)) out.push(candidate);
    }
    cursorMonthStart = addMonths(cursorMonthStart, 1);
  }
  return out;
}

/** WEEKLY/BIWEEKLY generator (interval in weeks) */
export function generateWeeklyDates(
  anchor: Date,
  interval: number,
  windowStart: Date,
  windowEnd: Date
): Date[] {
  const out: Date[] = [];
  const i = normalizeInterval(interval);
  let current = toUTCDate(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate());

  // advance to window start
  while (current < windowStart) {
    current = addWeeks(current, i);
  }
  while (current < windowEnd) {
    if (inWindow(current, windowStart, windowEnd)) out.push(current);
    current = addWeeks(current, i);
  }
  return out;
}

/** Apply overrides using schema: occurrence_date, override_type, paid_on, new_date */
export function applyOverrides(
  baseOccDateISO: string,
  ruleId: string,
  overrides: Override[]
): { dateISO: string; is_paid?: boolean; occurrence_id?: string } {
  const base = parseISO(baseOccDateISO);
  const candidates = (overrides as any[]).filter((o) => {
    if (String((o as any).rule_id ?? '') !== String(ruleId)) return false;
    const occ = (o as any).occurrence_date;
    if (!occ) return false;
    const od = parseISO(String(occ));
    return sameDayUTC(base, od);
  });

  if (candidates.length === 0) return { dateISO: baseOccDateISO };

  // Most recent override wins
  const chosen = candidates
    .slice()
    .sort((a: any, b: any) => {
      const ta = Date.parse(a.updated_at ?? a.created_at ?? 0);
      const tb = Date.parse(b.updated_at ?? b.created_at ?? 0);
      return tb - ta;
    })[0] as any;

  const res: { dateISO: string; is_paid?: boolean; occurrence_id?: string } = {
    dateISO: baseOccDateISO,
  };

  const t = String(chosen.override_type ?? '').toLowerCase();
  if (t === 'postponed' && chosen.new_date) {
    const nd = parseISO(String(chosen.new_date));
    // Emit date-only string using LOCAL midnight (no time, no Z)
    res.dateISO = format(new Date(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate()), 'yyyy-MM-dd');
  }
  if (t === 'paid' && chosen.paid_on) {
    res.is_paid = true;
  }
  if (chosen.id != null) res.occurrence_id = String(chosen.id);

  return res;
}

function buildOneTimeRows(
  entries: OneTimeEntry[],
  windowStart: Date,
  windowEnd: Date
): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  for (const e of entries as any[]) {
    if (!e?.due_date) continue;

    // Parse source date; build both LOCAL midnight (for display string)
    // and UTC midnight (for window comparison). Comparing in UTC keeps
    // the zone consistent with generators and window bounds.
    const dRaw = parseISO(String(e.due_date));
    const dLocal = new Date(dRaw.getUTCFullYear(), dRaw.getUTCMonth(), dRaw.getUTCDate());
    const dUTC = toUTCDate(dRaw.getUTCFullYear(), dRaw.getUTCMonth(), dRaw.getUTCDate());

    if (!inWindow(dUTC, windowStart, windowEnd)) continue;

    // Date-only string (YYYY-MM-DD), no time, no Z — use LOCAL midnight for stable display
    const iso = format(dLocal, 'yyyy-MM-dd');
    rows.push({
      id: String(e.id),
      kind: 'one_time',
      is_recurring: false,
      occurrence_id: null,
      rule_id: null,
      occurrence_date: null,
      amount: Number(e.amount ?? 0),
      type: String(e.type ?? 'expense').toLowerCase() as 'income' | 'expense',
      category: String((e as any).category ?? (e as any).category_name ?? ''),
      description: String(e.description ?? ''),
      date: iso,
      due_date: iso,
      effective_date: iso,
      is_paid: Boolean(e.is_paid),
    } as unknown as UnifiedRow);
  }
  return rows;
}

function buildRecurringRows(
  entries: OneTimeEntry[],
  rules: Rule[],
  overrides: Override[],
  windowStart: Date,
  windowEnd: Date
): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  const entryById = new Map<string, OneTimeEntry>();
  for (const e of entries as any[]) if (e?.id != null) entryById.set(String(e.id), e);

  for (const rAny of rules as any[]) {
    if (!rAny) continue;

    const active = (rAny as any).active;
    if (active === false) continue;

    const ruleId = String((rAny as any).id);
    const base: any =
      (rAny as any).entry_id != null ? (entryById.get(String((rAny as any).entry_id)) as any) : undefined;

    // Anchor: rule.start_anchor (ISO) else base.due_date
    const startAnchorISO: string | undefined = (rAny as any).start_anchor;
    const startAnchor =
      startAnchorISO ? parseISO(String(startAnchorISO)) : base?.due_date ? parseISO(String(base.due_date)) : undefined;
    if (!startAnchor) continue;

    const freq: string = String((rAny as any).frequency ?? 'monthly').toLowerCase();
    const intervalNum: number = Number((rAny as any).interval ?? 1);
    const endDate = (rAny as any).end_date ? parseISO(String((rAny as any).end_date)) : undefined;

    // Monthly DOM: r.dom or anchor day
    const dom: number =
      (rAny as any).dom != null ? Number((rAny as any).dom) : startAnchor.getUTCDate();

    let dates: Date[] = [];
    if (freq === 'weekly') {
      dates = generateWeeklyDates(
        toUTCDate(startAnchor.getUTCFullYear(), startAnchor.getUTCMonth(), startAnchor.getUTCDate()),
        normalizeInterval(intervalNum),
        windowStart,
        windowEnd
      );
    } else if (freq === 'biweekly') {
      dates = generateWeeklyDates(
        toUTCDate(startAnchor.getUTCFullYear(), startAnchor.getUTCMonth(), startAnchor.getUTCDate()),
        2,
        windowStart,
        windowEnd
      );
    } else {
      dates = generateMonthlyDates(
        toUTCDate(startAnchor.getUTCFullYear(), startAnchor.getUTCMonth(), startAnchor.getUTCDate()),
        normalizeInterval(Number(dom)),
        normalizeInterval(intervalNum),
        windowStart,
        windowEnd
      );
    }

    for (const sched of dates) {
      if (endDate && isAfter(sched, endDate)) continue;

      // Build base date-only (YYYY-MM-DD) for override matching (LOCAL midnight)
      const baseISO = format(
        new Date(sched.getUTCFullYear(), sched.getUTCMonth(), sched.getUTCDate()),
        'yyyy-MM-dd'
      );
      const o = applyOverrides(baseISO, ruleId, overrides as any[]);
      const finalDateLocal = parseISO(o.dateISO);

      // Compare in UTC zone to match window bounds & generator candidates
      const finalDateUTC = toUTCDate(
        finalDateLocal.getUTCFullYear(),
        finalDateLocal.getUTCMonth(),
        finalDateLocal.getUTCDate()
      );
      if (!inWindow(finalDateUTC, windowStart, windowEnd)) continue;

      // Final date-only (YYYY-MM-DD) for all UI-facing fields (LOCAL midnight)
      const iso = format(
        new Date(finalDateLocal.getUTCFullYear(), finalDateLocal.getUTCMonth(), finalDateLocal.getUTCDate()),
        'yyyy-MM-dd'
      );

      const amount = Number(base?.amount ?? (rAny as any).amount ?? 0);
      const type = String((base?.type ?? (rAny as any).type ?? 'expense')).toLowerCase() as
        | 'income'
        | 'expense';
      const description = String(
        base?.description ?? (rAny as any).description ?? ''
      );
      const category = String(
        base?.category ??
          base?.category_name ??
          (rAny as any).category ??
          (rAny as any).category_name ??
          ''
      );

      rows.push({
        id: ruleId, // base id = rule id
        kind: 'recurring',
        is_recurring: true,
        rule_id: ruleId,
        // UNIQUE occurrence id (override id wins; else derived)
        occurrence_id: o.occurrence_id ?? `${ruleId}:${iso}`,
        occurrence_date: iso,
        amount,
        type,
        category,
        description,
        date: iso,
        due_date: iso,
        effective_date: iso,
        is_paid: Boolean(o.is_paid ?? false),
      } as unknown as UnifiedRow);
    }
  }

  return rows;
}

export function unifyRows(
  entries: OneTimeEntry[],
  rules: Rule[],
  overrides: Override[],
  month_start: string,
  month_end: string
): UnifiedRow[] {
  // Normalize month window bounds to a single timezone (UTC) before all comparisons.
  // Keep [start inclusive, end exclusive] semantics.
  // IMPORTANT: End = start of next month (exclusive) so the last calendar day is included.
  const startLocal = parseISO(month_start);
  const windowStart = toUTCDate(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate());
  const startOfNextMonthLocal = addMonths(startLocal, 1);
  const windowEnd = toUTCDate(
    startOfNextMonthLocal.getFullYear(),
    startOfNextMonthLocal.getMonth(),
    startOfNextMonthLocal.getDate()
  );

  const oneTime = buildOneTimeRows(entries, windowStart, windowEnd);
  const recurring = buildRecurringRows(entries, rules, overrides, windowStart, windowEnd);

  // Combine and DE-DUPE
  const combined = oneTime.concat(recurring);
  const seen = new Set<string>();
  const deduped: UnifiedRow[] = [];

  for (const r of combined as any[]) {
    const eff = String(r.effective_date ?? r.due_date ?? r.date ?? '');
    const key =
      r.kind === 'recurring'
        ? `rec|${String(r.rule_id)}|${eff}`
        : `one|${String(r.id)}|${eff}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }

  // Sort by effective date, then by occurrence id (stable), then id
  deduped.sort((a: any, b: any) => {
    const da = parseISO(String(a.effective_date ?? a.due_date ?? a.date)).getTime();
    const db = parseISO(String(b.effective_date ?? b.due_date ?? b.date)).getTime();
    if (da !== db) return da - db;
    const oa = String(a.occurrence_id ?? '');
    const ob = String(b.occurrence_id ?? '');
    if (oa !== ob) return oa.localeCompare(ob);
    return String(a.id).localeCompare(String(b.id));
  });

  return deduped;
}

export function computeTotals(rows: UnifiedRow[]): Totals {
  let total_income = 0;
  let total_expenses = 0;
  let unpaid_expenses = 0;

  for (const r of rows as any[]) {
    const amount = Number(r.amount ?? 0);
    const type = String(r.type ?? 'expense').toLowerCase();

    if (type === 'income') {
      total_income += amount;
    } else {
      const absAmount = Math.abs(amount);
      total_expenses += absAmount;

      // Remaining-to-pay is the sum of UNPAID expenses only
      const isPaid = Boolean((r as any).is_paid);
      if (!isPaid) unpaid_expenses += absAmount;
    }
  }

  const remaining_to_pay = unpaid_expenses;
  return { total_income, total_expenses, remaining_to_pay };
}

export function computeSnapshot(inputs: {
  entries: OneTimeEntry[];
  rules: Rule[];
  overrides: Override[];
  month_start: string;
  month_end: string;
  today_local: string;
}): Snapshot {
  const { entries, rules, overrides, month_start, month_end, today_local } = inputs;

  const rows = unifyRows(entries ?? [], rules ?? [], overrides ?? [], month_start, month_end);

  // Derive display status from is_paid (single source of truth):
  // - If is_paid → 'Paid'
  // - Else keep existing status if present, otherwise 'Pending'
  const rowsWithStatus: UnifiedRow[] = (rows as any[]).map((r: any) => {
    const nextStatus = r.is_paid ? 'Paid' : (r.status ?? 'Pending');
    return { ...r, status: nextStatus } as UnifiedRow;
  });

  const totals = computeTotals(rowsWithStatus);
  return { month_start, month_end, rows: rowsWithStatus, totals };
}