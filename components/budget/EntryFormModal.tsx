'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react'; // Ensure Loader2 is imported
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';
import {
  upsertEntry,
  upsertRule,
  deleteRule,
  postponeEntry,
} from '@/app/(app)/budget/actions'; // Correct path assumed
import type { Category, EntryType, Frequency } from '@/lib/types';

// Helper to watch form status for server actions
function FormWatcher({ armed, onDone }: { armed: boolean; onDone: () => void }) {
  const { pending } = useFormStatus();
  const seenPending = useRef(false);

  useEffect(() => {
    if (!armed) return;
    if (pending) {
      seenPending.current = true;
    } else if (seenPending.current && !pending) {
      seenPending.current = false;
      onDone();
    }
  }, [pending, armed, onDone]);

  return null;
}

type Props = {
  open: boolean;
  initial: any | null; // Consider defining a specific type for 'initial'
  onClose: () => void;
  onSaved: (msg?: string) => void;
  today_local: string;
};

const expenseCategories: Category[] = ['bill', 'gas', 'groceries', 'loan', 'other', 'subscription'];
// Removed doordash_income and job_income as per types update
const incomeCategories: Category[] = ['business_income'];
const dowOptions = [
  { v: 1, label: 'Mon' }, { v: 2, label: 'Tue' }, { v: 3, label: 'Wed' },
  { v: 4, label: 'Thu' }, { v: 5, label: 'Fri' }, { v: 6, label: 'Sat' }, { v: 7, label: 'Sun' },
];

export default function EntryFormModal({ open, initial, onClose, onSaved, today_local }: Props) {
  const { notify } = useToast();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const isEditingRule = initial?.mode === 'rule' && !!initial?.id;
  const isEditingEntry = initial?.mode === 'entry' && !!initial?.id;
  const isPostponeEntry = initial?.mode === 'entry' && !!initial?.postpone;

  // State
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [type, setType] = useState<EntryType>('expense');
  const [category, setCategory] = useState<Category>(expenseCategories[0]);
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(today_local);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [domStr, setDomStr] = useState<string>('1');
  const [dowStr, setDowStr] = useState<string>('1');
  const [startAnchor, setStartAnchor] = useState<string>(today_local);
  const [ruleId, setRuleId] = useState<string | null>(null);
  const [isLoadingRule, setIsLoadingRule] = useState(false);

  // Control State
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const deleteRuleSubmitRef = useRef<HTMLButtonElement>(null);
  const [submitArmed, setSubmitArmed] = useState(false);
  const [postponeArmed, setPostponeArmed] = useState(false);
  const fetchingRuleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
        setIsLoadingRule(false);
        fetchingRuleIdRef.current = null;
        return;
    }

    const resetState = () => {
        setIsRecurring(false); setType('expense'); setCategory(expenseCategories[0]);
        setDescription(''); setAmount(''); setDueDate(today_local);
        setFrequency('monthly'); setDomStr('1'); setDowStr('1');
        setStartAnchor(today_local); setRuleId(null);
        setSubmitArmed(false); setPostponeArmed(false);
        setIsLoadingRule(false);
        fetchingRuleIdRef.current = null;
    };

    if (isEditingRule) {
        const currentInitialId = initial.id;
        setIsRecurring(true); // Set recurring true when editing a rule
        setRuleId(currentInitialId);
        setIsLoadingRule(true);
        fetchingRuleIdRef.current = currentInitialId;

        supabase.from('budget_rules').select('*').eq('id', currentInitialId).single()
            .then(({ data, error }) => {
                if (fetchingRuleIdRef.current !== currentInitialId || !open) {
                    console.log(`Ignoring stale fetch result for rule ID: ${currentInitialId}`);
                    return;
                }
                if (error || !data) {
                    console.error(`Error fetching rule ${currentInitialId}:`, error?.message);
                    notify({ title: 'Error', description: 'Could not load rule details.', variant: 'danger' });
                    onClose();
                } else {
                    setType(data.type ?? 'expense');
                    setCategory(data.category ?? expenseCategories[0]);
                    setDescription(data.description ?? '');
                    setAmount(String(data.amount ?? ''));
                    setFrequency(data.frequency ?? 'monthly');
                    setDomStr(data.dom != null ? String(data.dom) : '1');
                    setDowStr(data.dow != null ? String(data.dow) : '1');
                    setStartAnchor(data.start_anchor ?? today_local);
                }
                setIsLoadingRule(false);
            });
    } else if (isPostponeEntry && isEditingEntry) {
        resetState();
        setDueDate(initial.due_date ?? today_local);
        setDescription(initial.description ?? '');
        setAmount(String(initial.amount ?? ''));
        setType(initial.type ?? 'expense');
        setCategory(initial.category ?? expenseCategories[0]);
    } else if (isEditingEntry) {
        resetState();
        setIsRecurring(false); // Ensure recurring is false when editing a one-time entry
        setType(initial.type ?? 'expense');
        setCategory(initial.category ?? expenseCategories[0]);
        setDescription(initial.description ?? '');
        setAmount(String(initial.amount ?? ''));
        setDueDate(initial.due_date ?? today_local);
        setRuleId(null);
    } else { // Adding new item
        resetState();
    }
  }, [open, initial, isEditingEntry, isEditingRule, isPostponeEntry, supabase, today_local, notify, onClose]);

  // Effect to sync category options when type changes
  useEffect(() => {
    if (type === 'expense' && !expenseCategories.includes(category)) {
        setCategory(expenseCategories[0]);
    } else if (type === 'income' && !incomeCategories.includes(category)) {
        setCategory(incomeCategories[0]);
    }
  }, [type, category]);

  function validate(): { ok: boolean; msg?: string } {
    const amt = Number(amount);
    if (!description.trim()) return { ok: false, msg: 'Description is required.' };
    if (!amount || Number.isNaN(amt) || amt <= 0) return { ok: false, msg: 'Amount must be greater than 0.' };

    // Use isRecurring state for validation logic, covering Add New and Edit One-Time modes
    if (isRecurring) {
        if (!startAnchor) return { ok: false, msg: 'Start date is required for recurring items.' };
        if (frequency === 'monthly') {
            const dom = Number(domStr);
            if (!domStr || Number.isNaN(dom) || dom < 1 || dom > 31) return { ok: false, msg: 'Day of month must be 1-31.' };
        } else { // weekly or biweekly
            const dow = Number(dowStr);
            if (!dowStr || Number.isNaN(dow) || dow < 1 || dow > 7) return { ok: false, msg: 'Day of week must be 1-7.' };
        }
    } else { // One-time entry (either adding new or editing existing one-time)
        if (!dueDate) return { ok: false, msg: 'Due date is required for one-time entries.' };
    }
    return { ok: true };
  }

  const title = isPostponeEntry ? 'Postpone Entry' : isEditingRule ? 'Edit Recurring Item' : isEditingEntry ? 'Edit Entry' : 'Add New Transaction';
  const inputClasses = "block w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] transition-colors focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]/30 disabled:opacity-50";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50" />
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-3)]">
            <div className="mb-6 flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <h2 className="text-[var(--fs-h3)] font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"><X size={20} /></button>
            </div>

            {isLoadingRule ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
                </div>
            ) : isPostponeEntry && isEditingEntry ? (
              <form action={postponeEntry.bind(null, { id: initial.id, new_date: dueDate })} onSubmit={(e) => {
                  if (!dueDate) { e.preventDefault(); notify({ title: 'Error', description: 'Please pick a new due date.', variant: 'danger' }); return; }
                  setPostponeArmed(true);
              }} className="space-y-4">
                <FormWatcher armed={postponeArmed} onDone={() => onSaved('Entry postponed')} />
                <div>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">Postponing: <span className="font-medium text-[var(--text-primary)]">{description || 'Entry'}</span> for <span className="font-medium text-[var(--text-primary)]">${Number(amount || 0).toFixed(2)}</span></p>
                    <label htmlFor="postpone-date" className="mb-1 block text-sm font-medium">New Due Date</label>
                    <input type="date" id="postpone-date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className={inputClasses} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]">Cancel</button>
                  <button type="submit" className="h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)]">Save</button>
                </div>
              </form>
            ) : (
              <>
                {/* *** Main Form action depends on isRecurring state now *** */}
                <form action={isRecurring ? upsertRule.bind(null, { // Submit as rule if isRecurring is true
                    id: isEditingRule ? ruleId! : undefined, // Include ID only if editing existing rule
                    description, amount: Number(amount), type, category, frequency,
                    dom: frequency === 'monthly' ? Number(domStr) : null,
                    dow: frequency !== 'monthly' ? Number(dowStr) : null,
                    start_anchor: startAnchor,
                  }) : upsertEntry.bind(null, { // Submit as entry if isRecurring is false
                    id: isEditingEntry ? initial.id : undefined, // Include ID only if editing existing entry
                    description, amount: Number(amount), type, category, due_date: dueDate,
                  })}
                  onSubmit={(e) => {
                    const v = validate();
                    if (!v.ok) { e.preventDefault(); if (v.msg) notify({ title: 'Validation Error', description: v.msg, variant: 'warning' }); return; }
                    setSubmitArmed(true);
                  }}
                >
                  <FormWatcher armed={submitArmed} onDone={() => onSaved('Transaction saved')} />
                  {/* Form Fields... */}
                   <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <div>
                       <label className="mb-1 block text-sm font-medium">Type</label>
                       {/* *** REMOVED disabled={isEditingRule} *** */}
                       <select value={type} onChange={(e) => setType(e.target.value as EntryType)} className={inputClasses}>
                           <option value="expense">Expense</option>
                           <option value="income">Income</option>
                       </select>
                     </div>
                     <div>
                       <label className="mb-1 block text-sm font-medium">Category</label>
                       <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={`${inputClasses} capitalize`}>
                           {(type === 'expense' ? expenseCategories : incomeCategories).map((c) => (<option key={c} value={c}>{c.replaceAll('_', ' ')}</option>))}
                       </select>
                     </div>
                     <div className="sm:col-span-2">
                       <label className="mb-1 block text-sm font-medium">Description</label>
                       <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required className={inputClasses} />
                     </div>
                     <div>
                       <label className="mb-1 block text-sm font-medium">Amount</label>
                       <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required className={inputClasses} />
                     </div>
                      {/* *** MODIFIED Conditional Rendering for Checkbox *** */}
                      {/* Show checkbox if NOT editing an existing RULE */}
                     {!isEditingRule && (
                       <div className="flex items-end pb-2">
                         <div className="flex items-center gap-2">
                           <input id="recurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]" />
                           <label htmlFor="recurring" className="text-sm font-medium">Is it recurring?</label>
                         </div>
                       </div>
                     )}
                     {/* ********************************************* */}
                   </div>

                    {/* *** MODIFIED Conditional Rendering for Date/Recurring Fields *** */}
                   {!isRecurring ? ( // Show Due Date field if NOT recurring
                       <div className="mb-4">
                         <label className="mb-1 block text-sm font-medium">Due Date</label>
                         <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className={inputClasses} />
                       </div>
                   ) : ( // Show Recurring fields if recurring
                       <div className="mb-4 grid grid-cols-1 gap-4 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4 sm:grid-cols-2">
                           <div>
                               <label className="mb-1 block text-sm font-medium">Frequency</label>
                               <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={`${inputClasses} capitalize`}>
                                   <option value="monthly">Monthly</option>
                                   <option value="weekly">Weekly</option>
                                   <option value="biweekly">Bi-Weekly</option>
                               </select>
                           </div>
                           {frequency === 'monthly' ? (
                               <div>
                                   <label className="mb-1 block text-sm font-medium">Day of Month</label>
                                   <input type="number" min={1} max={31} value={domStr} onChange={(e) => setDomStr(e.target.value)} required className={inputClasses} />
                               </div>
                           ) : (
                               <div>
                                   <label className="mb-1 block text-sm font-medium">Day of Week</label>
                                   <select value={dowStr} onChange={(e) => setDowStr(e.target.value)} required className={inputClasses}>
                                       {dowOptions.map((o) => (<option key={o.v} value={String(o.v)}>{o.label}</option>))}
                                   </select>
                               </div>
                           )}
                           <div className="sm:col-span-2">
                               <label className="mb-1 block text-sm font-medium">Start Date (Anchor)</label>
                               <input type="date" value={startAnchor} onChange={(e) => setStartAnchor(e.target.value)} required className={inputClasses} />
                           </div>
                       </div>
                   )}
                   {/* ************************************************************* */}

                  {/* Form Actions */}
                  <div className="flex items-center justify-between pt-4">
                    {/* Delete button only appears when editing an existing rule */}
                    {isEditingRule ? (<button type="button" onClick={() => setShowConfirmDelete(true)} className="h-10 rounded-[var(--radius-md)] bg-red-500/10 px-4 text-sm font-medium text-red-600 shadow-sm hover:bg-red-500/20">Delete</button>) : <span />}
                    <div className="flex gap-3">
                      <button type="button" onClick={onClose} className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium shadow-sm hover:bg-[var(--bg-muted)]">Cancel</button>
                      <button type="submit" className="h-10 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm hover:bg-[var(--primary-600)]">Save</button>
                    </div>
                  </div>
                </form>

                {/* Hidden form for Delete Rule action */}
                {isEditingRule && ruleId && (
                  <form action={deleteRule.bind(null, { id: ruleId })}>
                    <FormWatcher armed={showConfirmDelete} onDone={() => onSaved('Recurring item deleted.')} />
                    <button ref={deleteRuleSubmitRef} type="submit" className="hidden" />
                  </form>
                )}

                {/* Confirmation Dialog for Delete Rule */}
                <ConfirmDialog
                  isOpen={showConfirmDelete}
                  onClose={() => setShowConfirmDelete(false)}
                  onConfirm={() => { deleteRuleSubmitRef.current?.click(); }}
                  title="Delete Recurring Item?"
                >Are you sure? This action cannot be undone.</ConfirmDialog>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}