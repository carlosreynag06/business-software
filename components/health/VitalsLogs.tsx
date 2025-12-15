'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartPulse,
  Plus,
  X,
  MoreHorizontal,
  Pencil,
  Trash2,
  Activity,
  Wind,
  Loader2,
} from 'lucide-react';

import type { VitalsRow, VitalType } from '@/app/(app)/health/actions';

/* =========================================================
   TYPES
   ========================================================= */

interface VitalsLogsProps {
  initialData: VitalsRow[];
  onSave: (payload: {
    id?: string;
    date: string;
    type: VitalType;
    valueSystolic?: number;
    valueDiastolic?: number;
    valueHR?: number;
    notes?: string;
  }) => Promise<{ success: boolean; id?: string; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

/* =========================================================
   UTILS & HELPERS
   ========================================================= */

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h3 className="text-base font-semibold text-[var(--text-primary,#0f172a)]">
        {title}
      </h3>
      <div className="flex items-center gap-2">{action}</div>
    </div>
  );
}

const inputClasses =
  'block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30';

const textAreaClasses =
  'block w-full rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50';

/* Small, fixed-size actions menu metrics (used for viewport positioning) */
const ACTION_MENU_WIDTH = 128; // matches w-32 (32 * 4)
const ACTION_MENU_HEIGHT = 88; // approx: 2 items + padding
const ACTION_MENU_GAP = 8; // px gap between button and menu

type MenuState = {
  id: string | null;
  top: number;
  left: number;
};

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function VitalsLogs({
  initialData,
  onSave,
  onDelete,
}: VitalsLogsProps) {
  // Local state sorted by date descending
  const [vitals, setVitals] = useState<VitalsRow[]>(
    [...initialData].sort((a, b) => b.reading_date.localeCompare(a.reading_date))
  );

  // Modal & Action State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVital, setEditingVital] = useState<VitalsRow | null>(null);
  const [vitalToDelete, setVitalToDelete] = useState<VitalsRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Single floating actions menu (portal-style, positioned via viewport coordinates)
  const [menuState, setMenuState] = useState<MenuState>({
    id: null,
    top: 0,
    left: 0,
  });

  // Update local state when props change
  useEffect(() => {
    setVitals(
      [...initialData].sort((a, b) => b.reading_date.localeCompare(a.reading_date))
    );
  }, [initialData]);

  // --- Handlers ---

  const handleMenuToggle = (id: string) => {
    // Close if same id is open
    if (menuState.id === id) {
      setMenuState({ id: null, top: 0, left: 0 });
      return;
    }

    // Button is identified per row
    const btn = document.getElementById(`vital-actions-${id}`);
    if (!btn) {
      setMenuState({ id: null, top: 0, left: 0 });
      return;
    }

    const rect = btn.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const openUp = spaceBelow < ACTION_MENU_HEIGHT + ACTION_MENU_GAP;

    const top = openUp
      ? rect.top - ACTION_MENU_HEIGHT - ACTION_MENU_GAP
      : rect.bottom + ACTION_MENU_GAP;

    const left = rect.right - ACTION_MENU_WIDTH;

    setMenuState({
      id,
      top,
      left,
    });
  };

  const handleAddClick = () => {
    setEditingVital(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (vital: VitalsRow) => {
    setMenuState({ id: null, top: 0, left: 0 });
    setEditingVital(vital);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (vital: VitalsRow) => {
    setMenuState({ id: null, top: 0, left: 0 });
    setVitalToDelete(vital);
  };

  const confirmDelete = async () => {
    if (!vitalToDelete) return;
    const id = vitalToDelete.id;

    // Optimistic update
    setVitals((prev) => prev.filter((v) => v.id !== id));
    setVitalToDelete(null);

    try {
      await onDelete(id);
    } catch (error) {
      console.error('Failed to delete vital:', error);
      // Revert would go here in a robust app, or toast error
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSaving) return;

    const formData = new FormData(e.currentTarget);
    const type = formData.get('vital-type') as VitalType;
    const date =
      (formData.get('vital-date') as string) ||
      new Date().toISOString().split('T')[0];
    const notes = (formData.get('vital-notes') as string) || undefined;

    // Payload construction
    let payload: any = {
      id: editingVital?.id,
      date,
      type,
      notes,
    };

    let isValid = true;

    if (type === 'BP') {
      const sys = parseInt(formData.get('vital-bp-systolic') as string, 10);
      const dia = parseInt(formData.get('vital-bp-diastolic') as string, 10);
      if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) {
        alert('Valid BP values required.');
        isValid = false;
      } else {
        payload.valueSystolic = sys;
        payload.valueDiastolic = dia;
      }
    } else {
      const hr = parseInt(formData.get('vital-hr-value') as string, 10);
      if (isNaN(hr) || hr <= 0) {
        alert('Valid Heart Rate required.');
        isValid = false;
      } else {
        payload.valueHR = hr;
      }
    }

    if (!isValid) return;

    setIsSaving(true);
    try {
      const result = await onSave(payload);
      if (result.success) {
        setIsModalOpen(false);
        setEditingVital(null);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving vital:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Computed Values for Display ---

  const getDisplayValue = (v: VitalsRow) => {
    if (v.vital_type === 'BP') {
      return `${v.systolic}/${v.diastolic}`;
    }
    return `${v.hr} bpm`;
  };

  const modalTitle = editingVital ? 'Edit Vitals Reading' : 'Log Vitals Reading';
  const saveButtonText = editingVital ? 'Save Changes' : 'Save Reading';

  // Modal default state
  const [modalType, setModalType] = useState<VitalType>('BP');
  useEffect(() => {
    if (isModalOpen) {
      setModalType(editingVital?.vital_type || 'BP');
    }
  }, [isModalOpen, editingVital]);

  return (
    <>
      <div className="rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] p-4 h-full">
        <SectionHeader
          title="Vitals Log"
          action={
            <button
              onClick={handleAddClick}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px]/5 font-medium text-white hover:bg-emerald-700"
              title="Log new vitals reading"
            >
              <Plus className="h-4 w-4" />
              Log Vitals
            </button>
          }
        />

        {/* Recent Readings Table */}
        <div className="mt-2 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="py-2 pl-4 pr-3 text-left font-semibold text-slate-900 sm:pl-0"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left font-semibold text-slate-900"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-2 text-left font-semibold text-slate-900"
                    >
                      Reading
                    </th>
                    <th
                      scope="col"
                      className="relative py-2 pl-3 pr-4 sm:pr-0"
                    >
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No vitals logged yet.
                      </td>
                    </tr>
                  ) : (
                    vitals.map((vital) => {
                      const isMenuOpen = menuState.id === vital.id;
                      const displayVal = getDisplayValue(vital);

                      return (
                        <tr key={vital.id}>
                          <td className="whitespace-nowrap py-3 pl-4 pr-3 text-slate-700 sm:pl-0">
                            {vital.reading_date}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                vital.vital_type === 'BP'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-pink-100 text-pink-700'
                              }`}
                            >
                              {vital.vital_type === 'BP' ? (
                                <Wind size={12} className="mr-1" />
                              ) : (
                                <Activity size={12} className="mr-1" />
                              )}
                              {vital.vital_type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                            {displayVal}
                          </td>
                          <td className="relative whitespace-nowrap py-3 pl-3 pr-4 text-right sm:pr-0">
                            <div className="inline-block text-left">
                              <button
                                id={`vital-actions-${vital.id}`}
                                onClick={() => handleMenuToggle(vital.id)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                                aria-haspopup="true"
                                aria-expanded={isMenuOpen}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTIONS MENU (opens up or down based on viewport space) */}
      <AnimatePresence>
        {menuState.id && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'fixed',
              top: menuState.top,
              left: menuState.left,
              width: ACTION_MENU_WIDTH,
            }}
            className="z-[120] origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            role="menu"
            tabIndex={-1}
          >
            <div className="py-1" role="none">
              {/* We find the active vital so actions still use the correct row */}
              {(() => {
                const active = vitals.find((v) => v.id === menuState.id);
                if (!active) return null;
                return (
                  <>
                    <button
                      onClick={() => handleEditClick(active)}
                      className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      role="menuitem"
                    >
                      <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(active)}
                      className="flex w-full items-center px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      role="menuitem"
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                      Delete
                    </button>
                  </>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingVital(null);
              }}
              className="absolute inset-0 bg-black/50"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.2 }}
              className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-3)]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="log-vitals-title"
            >
              <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
                <h2
                  id="log-vitals-title"
                  className="text-[var(--fs-h3)] font-semibold"
                >
                  {modalTitle}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingVital(null);
                  }}
                  aria-label="Close"
                  className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
                  disabled={isSaving}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveSubmit} className="space-y-4">
                {/* Date */}
                <div>
                  <label
                    htmlFor="vital-date"
                    className="mb-1 block text-sm font-medium"
                  >
                    Date
                  </label>
                  <input
                    type="date"
                    id="vital-date"
                    name="vital-date"
                    required
                    className={inputClasses}
                    defaultValue={
                      editingVital?.reading_date ||
                      new Date().toISOString().split('T')[0]
                    }
                    disabled={isSaving}
                  />
                </div>

                {/* Type Selection */}
                <div>
                  <label
                    htmlFor="vital-type"
                    className="mb-1 block text-sm font-medium"
                  >
                    Vital Type
                  </label>
                  <select
                    id="vital-type"
                    name="vital-type"
                    required
                    className={inputClasses}
                    value={modalType}
                    onChange={(e) => setModalType(e.target.value as VitalType)}
                    disabled={isSaving}
                  >
                    <option value="BP">Blood Pressure (BP)</option>
                    <option value="HR">Heart Rate (HR)</option>
                  </select>
                </div>

                {/* Values based on Type */}
                {modalType === 'BP' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="vital-bp-systolic"
                        className="mb-1 block text-sm font-medium"
                      >
                        Systolic (mmHg)
                      </label>
                      <input
                        type="number"
                        id="vital-bp-systolic"
                        name="vital-bp-systolic"
                        required
                        min="1"
                        placeholder="e.g., 120"
                        className={inputClasses}
                        defaultValue={editingVital?.systolic ?? ''}
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="vital-bp-diastolic"
                        className="mb-1 block text-sm font-medium"
                      >
                        Diastolic (mmHg)
                      </label>
                      <input
                        type="number"
                        id="vital-bp-diastolic"
                        name="vital-bp-diastolic"
                        required
                        min="1"
                        placeholder="e.g., 80"
                        className={inputClasses}
                        defaultValue={editingVital?.diastolic ?? ''}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="vital-hr-value"
                      className="mb-1 block text-sm font-medium"
                    >
                      Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      id="vital-hr-value"
                      name="vital-hr-value"
                      required
                      min="1"
                      placeholder="e.g., 65"
                      className={inputClasses}
                      defaultValue={editingVital?.hr ?? ''}
                      disabled={isSaving}
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label
                    htmlFor="vital-notes"
                    className="mb-1 block text-sm font-medium"
                  >
                    Notes (Optional)
                  </label>
                  <textarea
                    id="vital-notes"
                    name="vital-notes"
                    rows={2}
                    placeholder="e.g., Morning reading, after workout"
                    className={textAreaClasses}
                    defaultValue={editingVital?.notes || ''}
                    disabled={isSaving}
                  />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingVital(null);
                    }}
                    className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 inline-flex items-center justify-center rounded-[var(--radius-md)] bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-70"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      saveButtonText
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {vitalToDelete && (
          <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setVitalToDelete(null)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-delete-title"
            >
              <h3
                id="confirm-delete-title"
                className="text-lg font-medium text-gray-900"
              >
                Delete Reading?
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to delete the{' '}
                {vitalToDelete.vital_type} reading from{' '}
                {vitalToDelete.reading_date}? This cannot be undone.
              </p>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setVitalToDelete(null)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-md border border-transparent bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
