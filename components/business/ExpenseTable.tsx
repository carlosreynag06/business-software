'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Edit, Trash2, CheckCircle, Clock, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { BusinessSimExpense } from '@/lib/business.types'; // Updated import

// --- Sub-components ---

const StatusBadge = ({ status }: { status: 'pending' | 'paid' }) => {
  const styles = {
    paid: 'bg-[var(--success)]/10 text-[var(--success)]',
    pending: 'bg-[var(--warning)]/10 text-[var(--warning)]',
  };
  const cls = status === 'paid' ? styles.paid : styles.pending;
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
};

const TypeBadge = ({ type }: { type: 'one_time' | 'recurring' }) => {
  const isOneTime = type === 'one_time';
  const Icon = isOneTime ? Clock : Repeat;
  
  const styles = isOneTime
    ? 'bg-[var(--info)]/10 text-[var(--info)]'
    : 'bg-[var(--primary)]/10 text-[var(--primary)]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize ${styles}`}>
      <Icon size={12} className="shrink-0" />
      {isOneTime ? 'One-Time' : 'Recurring'}
    </span>
  );
};

// --- Portal-based Floating Menu ---

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
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

  const top = Math.round(anchorRect.bottom + 6);
  // Align right edge of menu with button's right edge
  const left = Math.max(8, Math.round(anchorRect.right - 170)); 

  const body = (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        minWidth: 160,
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        backgroundColor: 'var(--bg-surface)',
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

// --- Row Component ---

function Row({
  expense,
  onEdit,
  onDelete,
  onStatusToggle,
  formatCurrency,
}: {
  expense: BusinessSimExpense;
  onEdit: (expense: BusinessSimExpense) => void;
  onDelete: (expenseId: string) => void;
  onStatusToggle: (expenseId: string, currentStatus: 'pending' | 'paid') => void;
  formatCurrency: (amount: number) => string;
}) {
  const [openActionMenu, setOpenActionMenu] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const actionButtonRef = useRef<HTMLButtonElement>(null);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (openActionMenu) {
      setOpenActionMenu(false);
      return;
    }
    const rect = actionButtonRef.current?.getBoundingClientRect() ?? null;
    setAnchorRect(rect);
    setOpenActionMenu(true);
  };

  const handleEditClick = () => {
    onEdit(expense);
    setOpenActionMenu(false);
  };

  const handleDeleteClick = () => {
    onDelete(expense.id);
    setOpenActionMenu(false);
  };

  const handleStatusClick = () => {
    onStatusToggle(expense.id, expense.status);
    setOpenActionMenu(false);
  };

  // Shared inline style for menu items
  const menuItemStyle = "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors";
  const deleteItemStyle = "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors";

  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] last:border-0">
      {/* 1. Description */}
      <td className={clsx("px-6 py-4 font-medium text-[var(--text-primary)]", expense.status === 'paid' && "opacity-60")}>
        <div className="break-words">{expense.description}</div>
      </td>

      {/* 2. Type */}
      <td className="px-6 py-4 whitespace-nowrap">
        <TypeBadge type={expense.expense_type} />
      </td>

      {/* 3. Notes */}
      <td className={clsx("px-6 py-4 text-[var(--text-secondary)]", expense.status === 'paid' && "line-through opacity-60")}>
        <div className="break-words text-sm">
            {expense.notes || '-'}
        </div>
      </td>

      {/* 4. Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={expense.status} />
      </td>

      {/* 5. Amount */}
      <td className={clsx(
        "px-6 py-4 text-right font-semibold whitespace-nowrap", 
        expense.status === 'paid' ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"
      )}>
        {formatCurrency(expense.amount)}
      </td>

      {/* 6. Actions */}
      <td className="px-6 py-4 text-center">
        <div className="relative">
          <button
            ref={actionButtonRef}
            onClick={handleToggleMenu}
            className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            aria-haspopup="true"
            aria-expanded={openActionMenu}
            aria-label={`Actions for ${expense.description}`}
          >
            <MoreHorizontal size={18} />
          </button>

          <AnimatePresence>
            {openActionMenu && (
              <FloatingMenu
                anchorRect={anchorRect}
                onClose={() => setOpenActionMenu(false)}
              >
                <button onClick={handleStatusClick} className={menuItemStyle}>
                    <CheckCircle size={14} /> {expense.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                </button>
                <button onClick={handleEditClick} className={menuItemStyle}>
                  <Edit size={14} /> Edit
                </button>
                <div className="my-1 h-px bg-[var(--border-subtle)]" />
                <button onClick={handleDeleteClick} className={deleteItemStyle}>
                  <Trash2 size={14} /> Delete
                </button>
              </FloatingMenu>
            )}
          </AnimatePresence>
        </div>
      </td>
    </tr>
  );
}

// --- Main Table Component ---

export default function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
  onStatusToggle,
  formatCurrency,
}: {
  expenses: BusinessSimExpense[];
  onEdit: (expense: BusinessSimExpense) => void;
  onDelete: (expenseId: string) => void;
  onStatusToggle: (expenseId: string, currentStatus: 'pending' | 'paid') => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Using table-fixed for consistent column widths */}
      <table className="min-w-full text-sm table-fixed">
        <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)]">
          <tr>
             {/* Adjusted widths and order */}
            <th className="w-[25%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Description</th>
            <th className="w-[15%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Type</th>
            <th className="w-[25%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Notes</th>
            <th className="w-[15%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Status</th>
            <th className="w-[15%] px-6 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Amount</th>
            <th className="relative w-[5%] px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {expenses.length === 0 ? (
            <tr>
               <td colSpan={6} className="px-6 py-10 text-center text-[var(--text-tertiary)]">
                No simulated expenses match the current filter.
              </td>
            </tr>
          ) : (
            expenses.map((expense) => (
              <Row
                key={expense.id}
                expense={expense}
                onEdit={onEdit}
                onDelete={onDelete} // Pass handler
                onStatusToggle={onStatusToggle} // Pass handler
                formatCurrency={formatCurrency}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}