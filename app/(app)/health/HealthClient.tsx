'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Pill, Plus, PackagePlus, HeartPulse, X } from 'lucide-react';
import clsx from 'clsx';

// Components
import SupplementsTable from '@/components/health/SupplementsTable';
import AddSupplements from '@/components/health/AddSupplements';
import RefillSheet from '@/components/health/RefillSheet';
import BulkRefill from '@/components/health/BulkRefill';
import VitalsLogs from '@/components/health/VitalsLogs';

// Types from Actions
import type {
  SuppItem,
  InventoryEvent,
  VitalsRow,
  VitalType,
} from './actions';

/* =========================================================
   PROPS
   ========================================================= */
interface HealthClientProps {
  initialItems: SuppItem[];
  initialEvents: InventoryEvent[];
  initialVitals: VitalsRow[];
  
  // Supplement Actions
  addSupplementAction: (item: SuppItem) => Promise<void>;
  updateSupplementAction: (item: SuppItem) => Promise<void>;
  refillSupplementAction: (args: {
    id: string;
    qty: number;
    vendor?: string;
    cost?: number;
    name: string;
  }) => Promise<void>;
  bulkRefillAction: (refills: { id: string; qty: number }[]) => Promise<void>;
  deleteSupplementAction: (id: string) => Promise<void>;

  // Vitals Actions
  saveVitalsAction: (payload: {
    id?: string;
    date: string;
    type: VitalType;
    valueSystolic?: number;
    valueDiastolic?: number;
    valueHR?: number;
    notes?: string;
  }) => Promise<{ success: boolean; id?: string; error?: string }>;
  
  deleteVitalsAction: (id: string) => Promise<{ success: boolean; error?: string }>;
}

/* =========================================================
   HELPERS
   ========================================================= */
function classNames(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(' ');
}

function chipForDaysLeft(daysLeft: number) {
  if (daysLeft <= 2) return 'bg-rose-100 text-rose-700';
  if (daysLeft <= 5) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

/** Daily usage for an item */
function dailyUsage(item: SuppItem) {
  const usage = (item.units_per_dose || 0) * (item.times_per_day || 0);
  return usage > 0 ? usage : 1;
}

/** Integer days of inventory left */
function daysLeft(item: SuppItem) {
  const du = dailyUsage(item);
  return item.quantity_on_hand > 0
    ? Math.floor(item.quantity_on_hand / du)
    : 0;
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */
export default function HealthClient({
  initialItems,
  initialEvents,
  initialVitals,
  addSupplementAction,
  updateSupplementAction,
  refillSupplementAction,
  bulkRefillAction,
  deleteSupplementAction,
  saveVitalsAction,
  deleteVitalsAction,
}: HealthClientProps) {
  // --- State: Supplements ---
  const [items, setItems] = useState<SuppItem[]>(initialItems);
  // Events state kept for potential history UI, though currently unused in main view
  const [events, setEvents] = useState<InventoryEvent[]>(initialEvents);

  // --- State: Modals ---
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkRefillOpen, setIsBulkRefillOpen] = useState(false);
  const [refillFor, setRefillFor] = useState<SuppItem | null>(null);
  const [editingItem, setEditingItem] = useState<SuppItem | null>(null);

  // --- Derived: Low Stock Items ---
  const itemsLow = useMemo(
    () => items.filter((i) => daysLeft(i) <= i.refill_threshold_days),
    [items]
  );

  // --- Handlers: Supplements ---

  async function handleAdd(newItem: SuppItem) {
    // Optimistic Update
    setItems((prev) =>
      [newItem, ...prev].sort((a, b) =>
        (a.start_date || '').localeCompare(b.start_date || '')
      )
    );
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'added',
        at: 'Now',
        note: newItem.name,
      },
      ...prev,
    ]);
    setIsAddOpen(false);

    // Server Action
    await addSupplementAction(newItem);
  }

  async function handleEditSave(updated: SuppItem) {
    // Optimistic Update
    setItems((prev) =>
      prev
        .map((i) => (i.id === updated.id ? updated : i))
        .sort((a, b) =>
          (a.start_date || '').localeCompare(b.start_date || '')
        )
    );
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'edited',
        at: 'Now',
        note: updated.name,
      },
      ...prev,
    ]);
    setEditingItem(null);

    // Server Action
    await updateSupplementAction(updated);
  }

  async function handleRefill(
    itemId: string,
    qty: number,
    meta?: { vendor?: string; cost?: number }
  ) {
    const target = items.find((i) => i.id === itemId);
    const name = target?.name || 'Item';

    // Optimistic Update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              quantity_on_hand: (i.quantity_on_hand || 0) + qty,
            }
          : i
      )
    );
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'refilled',
        at: 'Now',
        note: `${name} +${qty}${
          meta?.vendor ? ` (${meta.vendor})` : ''
        }`,
      },
      ...prev,
    ]);
    setRefillFor(null);

    // Server Action
    await refillSupplementAction({
      id: itemId,
      qty,
      vendor: meta?.vendor,
      cost: meta?.cost,
      name,
    });
  }

  async function handleBulkRefill(refills: { id: string; qty: number }[]) {
    if (refills.length === 0) {
      setIsBulkRefillOpen(false);
      return;
    }

    // Optimistic Update
    const refillMap = new Map(refills.map((r) => [r.id, r.qty]));
    setItems((prev) =>
      prev.map((i) =>
        refillMap.has(i.id)
          ? {
              ...i,
              quantity_on_hand:
                (i.quantity_on_hand || 0) + (refillMap.get(i.id) || 0),
            }
          : i
      )
    );
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'refilled',
        at: 'Now',
        note: `Bulk refilled ${refills.length} ${
          refills.length === 1 ? 'item' : 'items'
        }`,
      },
      ...prev,
    ]);
    setIsBulkRefillOpen(false);

    // Server Action
    await bulkRefillAction(refills);
  }

  async function handleDelete(itemId: string) {
    const name = items.find((i) => i.id === itemId)?.name || 'Item';

    // Optimistic Update
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setEvents((prev) => [
      {
        id: crypto.randomUUID(),
        type: 'deleted',
        at: 'Now',
        note: name,
      },
      ...prev,
    ]);

    // Server Action
    await deleteSupplementAction(itemId);
  }

  // --- Render ---

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
            <HeartPulse className="h-5 w-5 text-emerald-700" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary,#0f172a)]">
              Health & Inventory
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px]/4 text-emerald-700">
                Personal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions (Supplements) */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[13px]/5 font-medium text-white hover:bg-emerald-700"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/40">
            <Plus className="h-4 w-4" />
          </span>
          Add Supplement
        </button>
        <button
          type="button"
          onClick={() => setIsBulkRefillOpen(true)}
          disabled={itemsLow.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px]/5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PackagePlus className="h-4 w-4 text-slate-700" />
          Refill Low Stock
        </button>
      </div>

      {/* 3. Top Grid: Running Out Soon & Vitals Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Running Out Soon */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--text-primary,#0f172a)]">
              Running Out Soon
            </h3>
          </div>
          <div className="flex flex-col gap-3">
            {itemsLow.length === 0 && (
              <div className="rounded-xl bg-emerald-50 p-3 text-[13px]/6 text-emerald-700">
                All good for the next 5 days.
              </div>
            )}
            {itemsLow.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100">
                      <Pill className="h-4 w-4 text-slate-700" />
                    </span>
                    <p className="truncate text-[13px]/6 font-medium text-slate-900">
                      {it.name}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[12px]/5 text-slate-600">
                    {it.dosage_per_unit} • {it.units_per_dose} units/dose •{' '}
                    {it.times_per_day}×/day
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span
                    className={classNames(
                      'rounded-full px-2 py-0.5 text-[12px]/5',
                      chipForDaysLeft(daysLeft(it))
                    )}
                  >
                    {daysLeft(it)} {daysLeft(it) === 1 ? 'day' : 'days'} left
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px]/5 text-slate-700 hover:bg-slate-50"
                    onClick={() => setRefillFor(it)}
                  >
                    Refill
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Vitals Log (Replaces Notes) */}
        {/* We pass props down to VitalsLogs so it can perform optimistic updates via the actions */}
        <VitalsLogs
          initialData={initialVitals}
          onSave={saveVitalsAction}
          onDelete={deleteVitalsAction}
        />
      </div>

      {/* 4. Bottom: Catalog */}
      <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] p-4" id="catalog">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h3 className="text-base font-semibold text-[var(--text-primary,#0f172a)]">
            Supplement Catalog
          </h3>
        </div>
        <SupplementsTable
          items={items}
          onEdit={setEditingItem}
          onDelete={handleDelete}
          onRefill={setRefillFor}
        />
      </div>

      {/* 5. Modals */}
      {isAddOpen && (
        <AddSupplements
          onClose={() => setIsAddOpen(false)}
          onSave={async (payload) => {
            const newItem: SuppItem = {
              id: crypto.randomUUID(),
              name: payload.name,
              brand: undefined, // AddSupplements doesn't capture brand currently
              form: payload.form,
              dosage_per_unit: payload.dosage_per_unit,
              units_per_dose: payload.units_per_dose,
              times_per_day: payload.times_per_day,
              time_slots: payload.time_slots,
              quantity_on_hand: payload.quantity_on_hand,
              refill_size: undefined, // AddSupplements doesn't capture refill size
              refill_threshold_days: payload.refill_threshold_days ?? 5,
              cost_per_unit: undefined,
              notes: payload.notes || undefined,
              start_date: new Date().toISOString().split('T')[0],
            };
            await handleAdd(newItem);
          }}
        />
      )}

      {/* Note: Using EditItemSheet which was defined locally in SupplementsClient 
          We need to make sure EditItemSheet is available. 
          Since we're replacing the whole file, I'll inline it below or import it if extracted.
          Per instructions, I'll inline the helper components here to ensure it's complete.
      */}
      {editingItem && (
        <EditItemSheet
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={async (updated) => {
            await handleEditSave(updated);
          }}
        />
      )}

      {refillFor && (
        <RefillSheet
          item={refillFor}
          onClose={() => setRefillFor(null)}
          onSave={async (qty, meta) => {
            await handleRefill(refillFor.id, qty, meta);
          }}
        />
      )}

      {isBulkRefillOpen && (
        <BulkRefill
          items={itemsLow}
          onClose={() => setIsBulkRefillOpen(false)}
          onSave={async (refills) => {
            await handleBulkRefill(refills);
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   LOCAL SUB-COMPONENTS
   (Inlined to ensure full functionality without missing imports)
   ========================================================= */

function EditItemSheet({
  item,
  onClose,
  onSave,
}: {
  item: SuppItem;
  onClose: () => void;
  onSave: (updated: SuppItem) => void;
}) {
  const [draft, setDraft] = useState<SuppItem>({ ...item });

  useEffect(() => {
    setDraft({ ...item });
  }, [item]);

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Edit Item</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Form */}
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Start date
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.start_date}
                  onChange={(e) =>
                    setDraft((f) => ({ ...f, start_date: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Form
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.form}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      form: e.target.value as any,
                    }))
                  }
                >
                  <option value="capsule">capsule</option>
                  <option value="tablet">tablet</option>
                  <option value="powder">powder</option>
                  <option value="liquid">liquid</option>
                </select>
              </label>
            </div>

            <label className="text-sm text-slate-700">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                value={draft.name}
                required
                onChange={(e) =>
                  setDraft((f) => ({ ...f, name: e.target.value }))
                }
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Dosage per unit
                <input
                  placeholder="e.g., 200 mg"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.dosage_per_unit}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      dosage_per_unit: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Units per dose
                <input
                  type="number"
                  min={1}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.units_per_dose}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      units_per_dose: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Times per day
                <input
                  type="number"
                  min={1}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.times_per_day}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      times_per_day: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Time slots (comma)
                <input
                  placeholder="08:00, 20:00"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.time_slots.join(', ')}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      time_slots: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter((s) => /^\d{2}:\d{2}$/.test(s) || s === ''),
                    }))
                  }
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Qty on hand
                <input
                  type="number"
                  min={0}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.quantity_on_hand}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      quantity_on_hand: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Threshold (days)
                <input
                  type="number"
                  min={1}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm"
                  value={draft.refill_threshold_days}
                  onChange={(e) =>
                    setDraft((f) => ({
                      ...f,
                      refill_threshold_days: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                />
              </label>
            </div>

            <label className="text-sm text-slate-700">
              Notes (opt)
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6"
                value={draft.notes ?? ''}
                onChange={(e) =>
                  setDraft((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </label>
          </div>
        </div>
        {/* Footer */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px]/5 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!draft.name.trim()) return;
              if (!draft.dosage_per_unit.trim()) return;
              if ((draft.units_per_dose || 0) < 1) return;
              if ((draft.times_per_day || 0) < 1) return;
              if ((draft.quantity_on_hand || 0) < 0) return;
              if ((draft.refill_threshold_days || 0) < 1) return;
              if (!draft.start_date) return;
              onSave(draft);
            }}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px]/5 font-medium text-white hover:bg-emerald-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}