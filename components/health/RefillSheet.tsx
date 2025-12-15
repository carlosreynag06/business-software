'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { SuppItem } from '@/app/(app)/health/actions';

export default function RefillSheet({
  item,
  onClose,
  onSave,
}: {
  item: SuppItem;
  onClose: () => void;
  onSave: (qty: number, meta?: { vendor?: string; cost?: number }) => void;
}) {
  const [qty, setQty] = useState(item.refill_size ?? 30);
  const [vendor, setVendor] = useState('');
  const [cost, setCost] = useState<number | ''>('');

  // Standard input styling using design tokens
  const inputClasses = "mt-1 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-3)]">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Refill Inventory</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-[var(--radius-md)] bg-[var(--bg-muted)] p-3">
            <div className="text-[13px]/6 font-medium text-[var(--text-primary)]">{item.name}</div>
            <div className="text-[12px]/5 text-[var(--text-secondary)]">
              {item.dosage_per_unit} · {item.units_per_dose} units/dose · {item.times_per_day}×/day
            </div>
          </div>

          <label className="block text-sm text-[var(--text-secondary)]">
            Quantity to add
            <input
              type="number"
              min={1}
              className={inputClasses}
              value={qty}
              onChange={(e) =>
                setQty(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm text-[var(--text-secondary)]">
              Vendor (opt)
              <input
                className={inputClasses}
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
              />
            </label>
            <label className="text-sm text-[var(--text-secondary)]">
              Cost (opt)
              <input
                type="number"
                min={0}
                step="0.01"
                className={inputClasses}
                value={cost === '' ? '' : cost}
                onChange={(e) =>
                  setCost(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-[12px]/5 text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave(qty, {
                vendor: vendor || undefined,
                cost: typeof cost === 'number' ? cost : undefined,
              })
            }
            className="rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-[12px]/5 font-medium text-white hover:bg-[var(--primary-600)] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}