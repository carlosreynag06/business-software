'use client';

import { useEffect, useRef, useState } from 'react';
import { parse, format } from 'date-fns';
import { useFormStatus } from 'react-dom';
import type { UnifiedRow } from '@/lib/types';
import { deleteEntry, deleteRule, markEntryPaid, markOccurrencePaid } from '@/app/(app)/budget/actions';
import { MoreHorizontal, Edit, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

// --- Custom Hook to Detect Outside Clicks (for non-portal bits) ---
const useOnClickOutside = (ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// --- Sub-components ---

function formatDate(value: string) {
  try {
    // Treat inputs as date-only. If an ISO timestamp is provided, strip to YYYY-MM-DD.
    const datePart = value.includes('T') ? value.slice(0, 10) : value;
    const d = parse(datePart, 'yyyy-MM-dd', new Date());
    return format(d, 'MMM d');
  } catch {
    return value;
  }
}

const StatusBadge = ({ status, overdue }: { status: 'Paid' | 'Pending'; overdue?: boolean }) => {
  const styles = {
    Paid: 'bg-[var(--success)]/10 text-[var(--success)]',
    PendingNeutral: 'bg-slate-500/10 text-slate-600',
    PendingOverdue: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  };

  const cls =
    status === 'Paid'
      ? styles.Paid
      : overdue
      ? styles.PendingOverdue
      : styles.PendingNeutral;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
};

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

/** Portal-based floating menu */
function FloatingMenu({
  anchorRect,
  onClose,
  children,
}: {
  anchorRect: DOMRect | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or outside click
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (menuRef.current && t && !menuRef.current.contains(t)) {
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Position: fixed relative to viewport (DOMRect is already viewport-based)
  const top = Math.round(anchorRect.bottom + 6);
  // Align right edge of menu with button's right edge (assume ~160px min-width)
  const left = Math.max(8, Math.round(anchorRect.right - 170));

  const body = (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      /* INLINE STYLES so portal menu is opaque and above table (styled-jsx doesn't scope into body) */
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        minWidth: 160,
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        backgroundColor: 'var(--bg-surface, #fff)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-2)',
      }}
    >
      {children}
    </motion.div>
  );

  return createPortal(body, document.body);
}

function Row({
  r, today_local, onEdit, onRequestConfirm, onAfterMutation, registerFirstOverdue,
}: {
  r: UnifiedRow; today_local: string; onEdit: (initial: any) => void;
  onRequestConfirm: (opts: { message: string; action: () => Promise<void> }) => void;
  onAfterMutation: (msg?: string) => void;
  registerFirstOverdue: (el: HTMLTableRowElement | null, isOverdue: boolean) => void;
}) {
  const [openActionMenu, setOpenActionMenu] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);

  // Optimistic "paid" flip (UI only) to reflect immediately while parent refreshes data
  const [optimisticPaid, setOptimisticPaid] = useState(false);

  // Fallback for code paths where kind may be absent
  const kind = (r as any).kind ?? ((r as any).rule_id ? 'recurring' : 'one_time');

  const isExpense = r.type === 'expense';
  const isPaidFromServer = r.status === 'Paid';
  const isPaidUI = isPaidFromServer || optimisticPaid;
  const canMarkPaid = isExpense && !isPaidUI;
  const amountClass = r.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]';

  const delEntrySubmitRef = useRef<HTMLButtonElement>(null);
  const delRuleSubmitRef = useRef<HTMLButtonElement>(null);

  const [paidArmed, setPaidArmed] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const handleDeleteConfirm = () => {
    setOpenActionMenu(false);
    setDeleteArmed(true);
    const message = kind === 'recurring' ? 'Delete this recurring item?' : 'Delete this entry?';
    onRequestConfirm({
      message,
      action: async () => {
        if (kind === 'recurring') {
          delRuleSubmitRef.current?.click();
        } else {
          delEntrySubmitRef.current?.click();
        }
      },
    });
  };

  const handleEdit = () => {
    setOpenActionMenu(false);
    if (kind === 'one_time') {
      onEdit({
        mode: 'entry', id: r.id, type: r.type, category: r.category,
        description: r.description, amount: r.amount, due_date: (r as any).effective_date ?? r.due_date ?? r.date,
      });
    } else {
      onEdit({ mode: 'rule', id: (r as any).rule_id ?? r.id });
    }
  };

  const onToggleMenu = () => {
    if (openActionMenu) {
      setOpenActionMenu(false);
      return;
    }
    const rect = actionButtonRef.current?.getBoundingClientRect() ?? null;
    setAnchorRect(rect);
    setOpenActionMenu(true);
  };

  const safeCategory = String((r as any).category ?? '').replaceAll('_', ' ');
  const effective = (r as any).effective_date ?? r.due_date ?? r.date;

  // --- UPDATED robust overdue check (mirrors Dashboard) ---
  const isOverdue = r.type === 'expense' && !r.is_paid && effective < today_local;

  // Shared inline style for menu items (since portal bypasses styled-jsx scoping)
  const menuItemStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    gap: 8,
    borderRadius: 'var(--radius-sm)',
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontSize: 14,
  };

  return (
    <tr ref={(el) => registerFirstOverdue(el, isOverdue)} className="transition-colors hover:bg-[var(--bg-muted)]">
      <td className="px-6 py-3 whitespace-nowrap">{formatDate(effective)}</td>
      <td className="px-6 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">{r.description}</td>
      <td className="px-6 py-3 capitalize whitespace-nowrap">{safeCategory}</td>
      <td className="px-6 py-3 whitespace-nowrap">
        <StatusBadge status={isPaidUI ? 'Paid' : 'Pending'} overdue={!isPaidUI && isOverdue} />
      </td>
      <td className={`px-6 py-3 text-right font-semibold whitespace-nowrap ${amountClass}`}>
        {r.type === 'income' ? '+' : ''}${r.amount.toFixed(2)}
      </td>
      <td className="px-6 py-3 text-center">
        <div className="relative">
          <button
            ref={actionButtonRef}
            onClick={onToggleMenu}
            className="rounded-md p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <MoreHorizontal size={18} />
          </button>

          <AnimatePresence>
            {openActionMenu && (
              <FloatingMenu
                anchorRect={anchorRect}
                onClose={() => setOpenActionMenu(false)}
              >
                <button onClick={handleEdit} style={menuItemStyle}>
                  <Edit size={14} /> Edit
                </button>

                {isExpense && !isPaidUI && (
                  kind === 'one_time' ? (
                    <form
                      action={markEntryPaid.bind(null, { id: r.id, paid_on: today_local })}
                      onSubmit={() => {
                        setPaidArmed(true);
                        setOpenActionMenu(false);
                        setOptimisticPaid(true); // optimistic UI flip
                      }}
                      className="w-full"
                    >
                      <FormWatcher armed={paidArmed} onDone={() => { onAfterMutation('Marked paid'); }} />
                      <button type="submit" style={menuItemStyle}>
                        <CheckCircle size={14} /> Mark Paid
                      </button>
                    </form>
                  ) : (
                    ((r as any).rule_id && (r as any).occurrence_date) && (
                      <form
                        action={markOccurrencePaid.bind(null, {
                          rule_id: (r as any).rule_id,
                          occurrence_date: (r as any).occurrence_date,
                          paid_on: today_local,
                        })}
                        onSubmit={() => {
                          setPaidArmed(true);
                          setOpenActionMenu(false);
                          setOptimisticPaid(true); // optimistic UI flip
                        }}
                        className="w-full"
                      >
                        <FormWatcher armed={paidArmed} onDone={() => { onAfterMutation('Marked paid'); }} />
                        <button type="submit" style={menuItemStyle}>
                          <CheckCircle size={14} /> Mark Paid
                        </button>
                      </form>
                    )
                  )
                )}

                <button onClick={handleDeleteConfirm} className="text-red-600" style={menuItemStyle}>
                  <Trash2 size={14} /> Delete
                </button>
              </FloatingMenu>
            )}
          </AnimatePresence>
        </div>

        {/* Hidden forms for server actions */}
        {kind === 'one_time' ? (
          <form action={deleteEntry.bind(null, { id: r.id })}>
            <FormWatcher armed={deleteArmed} onDone={() => { onAfterMutation('Deleted'); }} />
            <button ref={delEntrySubmitRef} type="submit" className="hidden" />
          </form>
        ) : (
          ((r as any).rule_id) && (
            <form action={deleteRule.bind(null, { id: (r as any).rule_id })}>
              <FormWatcher armed={deleteArmed} onDone={() => { onAfterMutation('Deleted'); }} />
              <button ref={delRuleSubmitRef} type="submit" className="hidden" />
            </form>
          )
        )}
      </td>
    </tr>
  );
}

export default function BudgetTable({
  rows, today_local, onEdit, onRequestConfirm, onAfterMutation
}: {
  rows: UnifiedRow[]; today_local: string; onEdit: (initial: any) => void;
  onRequestConfirm: (opts: { message: string; action: () => Promise<void> }) => void;
  onAfterMutation: (msg?: string) => void;
}) {
  const firstOverdueRef = useRef<HTMLTableRowElement | null>(null);
  const assignedRef = useRef(false);

  useEffect(() => {
    assignedRef.current = false;
    firstOverdueRef.current = null;
  }, [rows]);

  const registerFirstOverdue = (el: HTMLTableRowElement | null, isOverdue: boolean) => {
    if (!assignedRef.current && isOverdue && el) {
      assignedRef.current = true;
      firstOverdueRef.current = el;
    }
  };

  // --- UPDATED robust overdue totals (mirror Dashboard logic) ---
  const overdueRows = rows.filter(
    (r) => r.type === 'expense' && !r.is_paid && ((r as any).effective_date ?? (r as any).due_date ?? (r as any).date) < today_local
  );
  const overdueCount = overdueRows.length;
  const overdueTotal = overdueRows.reduce((sum, r) => sum + r.amount, 0);

  const scrollToFirstOverdue = () => {
    if (firstOverdueRef.current) {
      firstOverdueRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstOverdueRef.current.classList.add('ring-2', 'ring-offset-2', 'ring-[var(--danger)]');
      setTimeout(() => {
        firstOverdueRef.current?.classList.remove('ring-2', 'ring-offset-2', 'ring-[var(--danger)]');
      }, 1200);
    }
  };

  return (
    <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)] overflow-hidden">
      {overdueCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--danger)]/5 p-4">
          <div className="text-sm">
            <span className="font-semibold text-[var(--danger)]">{overdueCount} overdue item{overdueCount > 1 ? 's' : ''}</span>
            <span className="text-[var(--text-secondary)]"> totaling </span>
            <span className="font-semibold text-[var(--danger)]">${overdueTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={scrollToFirstOverdue}
            className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-3 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[var(--danger)]/20"
          >
            Jump to first
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--bg-muted)]">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Due Date</th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Description</th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Category</th>
              <th className="px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Status</th>
              <th className="px-6 py-3 text-right font-semibold text-[var(--text-secondary)]">Amount</th>
              <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[var(--text-tertiary)]">
                  No transactions for this period.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <Row
                  key={(r as any).occurrence_id ?? `${r.id}:${(r as any).effective_date ?? r.due_date ?? r.date}`}
                  r={r}
                  today_local={today_local}
                  onEdit={onEdit}
                  onRequestConfirm={onRequestConfirm}
                  onAfterMutation={onAfterMutation}
                  registerFirstOverdue={registerFirstOverdue}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Keep CSS block for non-portal descendants if needed elsewhere */}
      <style jsx>{`
        .action-menu-item:hover { background-color: var(--bg-muted); }
      `}</style>
    </div>
  );
}