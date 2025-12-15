'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

// Define the form shape locally
type AddFormState = {
  category: string;
  name: string;
  form: 'capsule' | 'tablet' | 'powder' | 'liquid';
  dosage_per_unit: string;
  units_per_dose: number;
  times_per_day: number;
  time_slots: string[];
  quantity_on_hand: number;
  refill_threshold_days: number;
  notes: string;
};

export default function AddSupplements({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: AddFormState) => void;
}) {
  const [form, setForm] = useState<AddFormState>({
    category: 'Supplement',
    name: '',
    form: 'capsule',
    dosage_per_unit: '',
    units_per_dose: 1,
    times_per_day: 1,
    time_slots: ['08:00'],
    quantity_on_hand: 30,
    refill_threshold_days: 5,
    notes: '',
  });

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Add Item</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3">
            {/* Row: Category + Form */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Category
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                >
                  <option>Supplement</option>
                  <option>Medication</option>
                </select>
              </label>
              <label className="text-sm text-slate-700">
                Form
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.form}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, form: e.target.value as any }))
                  }
                >
                  <option value="capsule">capsule</option>
                  <option value="tablet">tablet</option>
                  <option value="powder">powder</option>
                  <option value="liquid">liquid</option>
                </select>
              </label>
            </div>

            {/* Row: Name (full) */}
            <label className="text-sm text-slate-700">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                value={form.name}
                placeholder="e.g. Magnesium Glycinate"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>

            {/* Row: Dosage + Units per dose */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Dosage per unit
                <input
                  placeholder="e.g., 200 mg"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.dosage_per_unit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dosage_per_unit: e.target.value }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Units per dose
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.units_per_dose}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      units_per_dose: Number(e.target.value) || 1,
                    }))
                  }
                />
              </label>
            </div>

            {/* Row: Times per day + Time slots */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Times per day
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.times_per_day}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      times_per_day: Number(e.target.value) || 1,
                    }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Time slots (comma)
                <input
                  placeholder="08:00, 20:00"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.time_slots.join(', ')}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      time_slots: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </label>
            </div>

            {/* Row: Qty on hand + Threshold */}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm text-slate-700">
                Qty on hand
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.quantity_on_hand}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      quantity_on_hand: Number(e.target.value) || 0,
                    }))
                  }
                />
              </label>
              <label className="text-sm text-slate-700">
                Threshold (days)
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  value={form.refill_threshold_days}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      refill_threshold_days: Number(e.target.value) || 5,
                    }))
                  }
                />
              </label>
            </div>

            {/* Row: Notes (full) */}
            <label className="text-sm text-slate-700">
              Notes (opt)
              <textarea
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
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
              if (!form.name.trim()) return;
              onSave(form);
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