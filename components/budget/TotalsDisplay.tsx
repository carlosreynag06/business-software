'use client';

import type { Totals } from '@/lib/types';

export default function TotalsDisplay({ totals }: { totals: Totals }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {/* Total Income Card */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
        <div className="text-sm font-medium uppercase text-[var(--text-secondary)]">Total Income</div>
        <div className="mt-1 text-[var(--fs-h2)] font-bold text-[var(--success)]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            totals.total_income
          )}
        </div>
      </div>

      {/* Total Expenses Card */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
        <div className="text-sm font-medium uppercase text-[var(--text-secondary)]">Total Expenses</div>
        <div className="mt-1 text-[var(--fs-h2)] font-bold text-[var(--danger)]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            totals.total_expenses
          )}
        </div>
      </div>

      {/* Remaining To Pay Card */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
        <div className="text-sm font-medium uppercase text-[var(--text-secondary)]">Remaining To Pay</div>
        <div className="mt-1 text-[var(--fs-h2)] font-bold text-[var(--warning)]">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
            totals.remaining_to_pay
          )}
        </div>
      </div>
    </div>
  );
}