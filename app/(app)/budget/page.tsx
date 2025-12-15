import { format, startOfMonth, endOfMonth, addMonths, parseISO } from 'date-fns';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BudgetManager from '@/components/budget/BudgetManager';
import { getRawBudgetData } from '@/app/(app)/budget/actions';
import { computeSnapshot } from '@/lib/BudgetLogic';

export default async function BudgetPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const now = new Date();
  const today_local = format(now, 'yyyy-MM-dd');

  // THIS MONTH
  const month_start = format(startOfMonth(now), 'yyyy-MM-dd');
  const month_end = format(endOfMonth(now), 'yyyy-MM-dd');

  // NEXT MONTH
  const nmStartDate = startOfMonth(addMonths(now, 1));
  const nmEndDate = endOfMonth(nmStartDate);
  const next_month_start = format(nmStartDate, 'yyyy-MM-dd');
  const next_month_end = format(nmEndDate, 'yyyy-MM-dd');

  // Fetch data for each window separately
  const [thisMonthData, nextMonthData] = await Promise.all([
    getRawBudgetData({ month_start, month_end }),
    getRawBudgetData({ month_start: next_month_start, month_end: next_month_end }),
  ]);

  const snapshotThis = computeSnapshot({
    entries: thisMonthData.entries,
    rules: thisMonthData.rules,
    overrides: thisMonthData.overrides,
    month_start,
    month_end,
    today_local,
  });

  const snapshotNext = computeSnapshot({
    entries: nextMonthData.entries,
    rules: nextMonthData.rules,
    overrides: nextMonthData.overrides,
    month_start: next_month_start,
    month_end: next_month_end,
    today_local,
  });

  const monthLabelThis = format(parseISO(month_start), 'MMMM yyyy');
  const monthLabelNext = format(parseISO(next_month_start), 'MMMM yyyy');

  return (
    <div className="p-6 md:p-8">
      <BudgetManager
        initialSnapshotThis={snapshotThis}
        initialSnapshotNext={snapshotNext}
        month_start={month_start}
        month_end={month_end}
        next_month_start={next_month_start}
        next_month_end={next_month_end}
        today_local={today_local}
        monthLabelThis={monthLabelThis}
        monthLabelNext={monthLabelNext}
      />
    </div>
  );
}
