'use client'; 

import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Pencil,
  Trash2,
  PackagePlus,
  Search,
  MoreHorizontal,
} from 'lucide-react';
import type { SuppItem } from '@/app/(app)/health/actions';

/* ---------- helpers ---------- */

function classNames(...c: Array<string | false | undefined>) {
  return c.filter(Boolean).join(' ');
}

function chipForDaysLeft(daysLeft: number) {
  if (daysLeft <= 2) return 'bg-rose-100 text-rose-700';
  if (daysLeft <= 5) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function dailyUsage(item: SuppItem) {
  return (item.units_per_dose || 0) * (item.times_per_day || 0);
}

function daysLeft(item: SuppItem) {
  const du = dailyUsage(item) || 1;
  return Math.floor(item.quantity_on_hand / du);
}

type Props = {
  items: SuppItem[];
  onEdit: (item: SuppItem) => void;
  onDelete: (id: string) => void;
  onRefill: (item: SuppItem) => void;
};

type MenuPos = { top: number; left: number };

export default function SupplementsTable({
  items,
  onEdit,
  onDelete,
  onRefill,
}: Props) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'All' | 'Low'>('All');
  const [sort, setSort] = useState<'Start' | 'Name' | 'Days' | 'Qty'>('Start');

  // which row menu is open (store item.id or null)
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuItem, setMenuItem] = useState<SuppItem | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  const filtered = useMemo(() => {
    let out = items.filter((i) => {
      // text search
      if (q.trim()) {
        const t = q.toLowerCase();
        const haystack = `${i.name} ${i.brand ?? ''} ${i.form} ${i.dosage_per_unit}`.toLowerCase();
        if (!haystack.includes(t)) return false;
      }
      // filter "Low" = running out soon
      if (filter === 'Low') {
        return daysLeft(i) <= i.refill_threshold_days;
      }
      return true;
    });

    out.sort((a, b) => {
      if (sort === 'Start') {
        return (a.start_date || '').localeCompare(b.start_date || '');
      }
      if (sort === 'Name') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'Days') {
        return daysLeft(a) - daysLeft(b);
      }
      if (sort === 'Qty') {
        return a.quantity_on_hand - b.quantity_on_hand;
      }
      return 0;
    });

    return out;
  }, [items, q, filter, sort]);

  function closeMenu() {
    setMenuOpenFor(null);
    setMenuItem(null);
    setMenuPos(null);
  }

  function handleMenuToggle(
    item: SuppItem,
    e: React.MouseEvent<HTMLButtonElement>
  ) {
    e.stopPropagation();

    // Clicking the same item closes the menu
    if (menuOpenFor === item.id) {
      closeMenu();
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    // Match menu size: w-32 (128px) and ~3 options high (~120px)
    const MENU_WIDTH = 128;
    const MENU_HEIGHT = 120;
    const margin = 8;

    let top = rect.bottom + 4; // default: open below
    const viewportHeight = window.innerHeight;

    // If opening down would overflow the viewport, open upwards
    if (top + MENU_HEIGHT + margin > viewportHeight) {
      top = rect.top - MENU_HEIGHT - 4;
    }

    let left = rect.right - MENU_WIDTH;
    if (left < margin) left = margin;

    setMenuPos({ top, left });
    setMenuItem(item);
    setMenuOpenFor(item.id);
  }

  function handleMenuAction(
    action: 'edit' | 'refill' | 'delete',
    item: SuppItem
  ) {
    if (action === 'edit') onEdit(item);
    if (action === 'refill') onRefill(item);
    if (action === 'delete') onDelete(item.id);
    closeMenu();
  }

  return (
    <div id="catalog" className="flex flex-col gap-3">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="w-60 rounded-lg border border-slate-200 bg-white pl-7 pr-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'All' | 'Low')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="All">All</option>
          <option value="Low">Low</option>
        </select>
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as 'Start' | 'Name' | 'Days' | 'Qty')
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="Start">Sort: Start date</option>
          <option value="Name">Sort: Name</option>
          <option value="Days">Sort: Days left</option>
          <option value="Qty">Sort: Qty</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-[13px]/6">
          <thead className="text-[12px]/5 text-slate-500">
            <tr>
              <th className="py-2 pr-4">Start Date</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Dosage</th>
              <th className="py-2 pr-4">Frequency</th>
              <th className="py-2 pr-4">Qty on Hand</th>
              <th className="py-2 pr-4">Days Left</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center text-slate-500"
                >
                  No items yet. Add your first one.
                </td>
              </tr>
            )}
            {filtered.map((i) => {
              const d = daysLeft(i);

              return (
                <tr
                  key={i.id}
                  className="border-t border-slate-100 align-top"
                >
                  {/* Start Date */}
                  <td className="py-2 pr-4 whitespace-nowrap text-[12px]/5 text-slate-600">
                    {i.start_date || '—'}
                  </td>

                  {/* Name / brand / form */}
                  <td className="py-2 pr-4">
                    <div className="font-medium">{i.name}</div>
                    <div className="text-[12px]/5 text-slate-500">
                      {(i.brand ? `${i.brand} · ` : '')}
                      {i.form}
                    </div>
                  </td>

                  {/* Dosage */}
                  <td className="py-2 pr-4">
                    {i.dosage_per_unit} · {i.units_per_dose} units/dose
                  </td>

                  {/* Frequency */}
                  <td className="py-2 pr-4">
                    {i.times_per_day}×/day ({i.time_slots.join(', ')})
                  </td>

                  {/* Qty on hand */}
                  <td className="py-2 pr-4">{i.quantity_on_hand}</td>

                  {/* Days left */}
                  <td className="py-2 pr-4">
                    <span
                      className={classNames(
                        'rounded-full px-2 py-0.5 text-[12px]/5',
                        chipForDaysLeft(d)
                      )}
                    >
                      {d} {d === 1 ? 'day' : 'days'}
                    </span>
                  </td>

                  {/* Actions menu (kebab) */}
                  <td className="py-2 pr-4 text-right">
                    <button
                      className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-50"
                      aria-label="Actions"
                      title="Actions"
                      onClick={(e) => handleMenuToggle(i, e)}
                    >
                      <MoreHorizontal className="h-4 w-4 text-slate-700" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.length === 0 && (
          // Updated to design system tokens: rounded-lg, surface-elev-1, shadow-1
          <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] p-4 text-center text-slate-500">
            No items yet. Add your first one.
          </div>
        )}
        {filtered.map((i) => {
          const d = daysLeft(i);

          return (
            // Updated to design system tokens: rounded-lg, surface-elev-1, shadow-1
            <div
              key={i.id}
              className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="mb-1 text-[12px]/5 text-slate-500">
                    Start: {i.start_date || '—'}
                  </div>
                  <p className="truncate text-[13px]/6 font-medium text-slate-900">
                    {i.name}
                  </p>
                  <p className="mt-0.5 text-[12px]/5 text-slate-600">
                    {(i.brand ? `${i.brand} · ` : '')}
                    {i.form} · {i.dosage_per_unit}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]/5 text-slate-700">
                    <div>Freq: {i.times_per_day}×/day</div>
                    <div>Slots: {i.time_slots.join(', ')}</div>
                    <div>Qty: {i.quantity_on_hand}</div>
                    <div>
                      <span
                        className={classNames(
                          'rounded-full px-2 py-0.5 text-[12px]/5',
                          chipForDaysLeft(d)
                        )}
                      >
                        {d} {d === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-50"
                    aria-label="Actions"
                    title="Actions"
                    onClick={(e) => handleMenuToggle(i, e)}
                  >
                    <MoreHorizontal className="h-4 w-4 text-slate-700" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating actions menu (portal) */}
      {menuOpenFor && menuItem && menuPos
        ? createPortal(
            <div
              className="fixed inset-0 z-40"
              onClick={closeMenu}
            >
              <div
                className="absolute z-50 w-32 rounded-lg border border-slate-200 bg-white py-1 text-[12px]/5 text-slate-700 shadow-lg"
                style={{ top: menuPos.top, left: menuPos.left }}
                onClick={(e) => e.stopPropagation()}
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => handleMenuAction('edit', menuItem)}
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-600" />
                  <span>Edit</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => handleMenuAction('refill', menuItem)}
                >
                  <PackagePlus className="h-3.5 w-3.5 text-slate-600" />
                  <span>Refill</span>
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  onClick={() => handleMenuAction('delete', menuItem)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
