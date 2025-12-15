'use client';

import React, { useEffect, useState } from 'react';
import { X, PackagePlus } from 'lucide-react';
import type { SuppItem } from '@/app/(app)/health/actions';

type RefillItem = {
  id: string;
  name: string;
  qty: number;
  checked: boolean;
};

type Props = {
  items: SuppItem[]; // Expects only the items that are "low"
  onClose: () => void;
  onSave: (refills: { id: string; qty: number }[]) => void;
};

export default function BulkRefill({ items, onClose, onSave }: Props) {
  const [refillList, setRefillList] = useState<RefillItem[]>([]);

  // On mount, initialize the list of items to refill
  useEffect(() => {
    setRefillList(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.refill_size ?? 30, // Default to refill_size or 30
        checked: true, // Default all low items to be refilled
      }))
    );
  }, [items]);

  // Handler to toggle a single item
  function handleCheckChange(id: string) {
    setRefillList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  }

  // Handler to update quantity for a single item
  function handleQtyChange(id: string, newQty: number) {
    setRefillList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, newQty || 1) } : item
      )
    );
  }

  // Handler to toggle all items
  function handleToggleAll() {
    const allChecked = refillList.every((item) => item.checked);
    setRefillList((prev) =>
      prev.map((item) => ({ ...item, checked: !allChecked }))
    );
  }

  function handleSave() {
    const itemsToSave = refillList
      .filter((item) => item.checked && item.qty > 0)
      .map(({ id, qty }) => ({ id, qty }));
    onSave(itemsToSave);
  }

  const allChecked =
    refillList.length > 0 && refillList.every((item) => item.checked);
  const itemsToRefillCount = refillList.filter((item) => item.checked).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-3)]">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Refill Low Inventory
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <div className="flex flex-col gap-3">
            {refillList.length > 0 && (
              <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  checked={allChecked}
                  onChange={handleToggleAll}
                  aria-label="Toggle all items"
                />
                <label
                  onClick={handleToggleAll}
                  className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]"
                >
                  {allChecked ? 'Deselect All' : 'Select All'}
                </label>
              </div>
            )}

            {refillList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3"
              >
                <div className="flex flex-1 items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    checked={item.checked}
                    onChange={() => handleCheckChange(item.id)}
                    aria-labelledby={`item-name-${item.id}`}
                  />
                  <label
                    id={`item-name-${item.id}`}
                    htmlFor={`item-qty-${item.id}`}
                    className="flex-1 text-[13px]/6 font-medium text-[var(--text-primary)]"
                  >
                    {item.name}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`item-qty-${item.id}`}
                    className="text-sm text-[var(--text-secondary)]"
                  >
                    Qty
                  </label>
                  <input
                    id={`item-qty-${item.id}`}
                    type="number"
                    min={1}
                    className="w-20 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5 text-sm focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:outline-none transition-colors"
                    value={item.qty}
                    onChange={(e) =>
                      handleQtyChange(item.id, Number(e.target.value))
                    }
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
              </div>
            ))}
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
            onClick={handleSave}
            disabled={itemsToRefillCount === 0}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-3 py-1.5 text-[12px]/5 font-medium text-white hover:bg-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <PackagePlus className="h-4 w-4 text-white" />
            Refill {itemsToRefillCount} {itemsToRefillCount === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
}