'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Edit, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import type { ShoppingItem } from '@/app/(app)/shopping/actions'; // Updated import

// --- Custom Hook to Detect Outside Clicks ---
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
// Adapted StatusBadge for 'to_buy' and 'bought'
const StatusBadge = ({ status }: { status: 'to_buy' | 'bought' }) => {
  const styles = {
    bought: 'bg-[var(--success)]/10 text-[var(--success)]', // Updated to design token
    to_buy: 'bg-[var(--warning)]/10 text-[var(--warning)]', // Updated to design token
  };
  const cls = status === 'bought' ? styles.bought : styles.to_buy;
  const text = status === 'bought' ? 'Bought' : 'To Buy';
  
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {text}
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
  const left = Math.max(8, Math.round(anchorRect.right - 170)); // Assuming menu width

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
  item,
  onEdit,
  onDelete,
  onStatusToggle,
  formatCurrency,
}: {
  item: ShoppingItem;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (itemId: string) => void;
  onStatusToggle: (itemId: string, currentStatus: 'to_buy' | 'bought') => void;
  formatCurrency: (amount: number | null | undefined) => string;
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
    onEdit(item);
    setOpenActionMenu(false);
  };

  const handleDeleteClick = () => {
    onDelete(item.id);
    setOpenActionMenu(false);
  };

  const handleStatusClick = () => {
    onStatusToggle(item.id, item.status);
    setOpenActionMenu(false);
  };

  // Shared inline style for menu items
  const menuItemStyle = "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors";
  const deleteItemStyle = "flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors";


  return (
    <tr className="transition-colors hover:bg-[var(--bg-muted)] border-b border-[var(--border-subtle)] last:border-0">
      {/* 1. Description */}
      <td className={clsx(
          "px-6 py-4 font-medium text-[var(--text-primary)]",
          item.status === 'bought' && "text-[var(--text-tertiary)] opacity-60"
        )}>
        <div className="break-words">{item.description}</div>
      </td>

      {/* 2. Notes */}
      <td className={clsx(
          "px-6 py-4 text-[var(--text-secondary)] text-sm",
          item.status === 'bought' && "line-through opacity-60"
        )}>
        <div className="break-words">
            {item.notes || '-'}
        </div>
      </td>

      {/* 3. Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={item.status} />
      </td>

      {/* 4. Estimated Cost */}
      <td className={clsx(
          "px-6 py-4 text-right font-semibold whitespace-nowrap",
          item.status === 'bought' ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"
        )}>
        {formatCurrency(item.estimated_cost)}
      </td>

      {/* 5. Actions */}
      <td className="px-6 py-4 text-center">
        <div className="relative">
          <button
            ref={actionButtonRef}
            onClick={handleToggleMenu}
            className="rounded-md p-1 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
            aria-haspopup="true"
            aria-expanded={openActionMenu}
            aria-label={`Actions for ${item.description}`}
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
                  <CheckCircle size={14} /> {item.status === 'bought' ? 'Mark To Buy' : 'Mark Bought'}
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
export default function ShoppingTable({
  items,
  onEdit,
  onDelete,
  onStatusToggle,
  formatCurrency,
}: {
  items: ShoppingItem[];
  onEdit: (item: ShoppingItem) => void;
  onDelete: (itemId: string) => void;
  onStatusToggle: (itemId: string, currentStatus: 'to_buy' | 'bought') => void;
  formatCurrency: (amount: number | null | undefined) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Using table-fixed for consistent column widths */}
      <table className="min-w-full text-sm table-fixed">
        <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-subtle)]">
          <tr>
             {/* Adjusted widths and order */}
            <th className="w-[35%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Description</th>
            <th className="w-[30%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)]">Notes</th>
            <th className="w-[10%] px-6 py-3 text-left font-semibold text-[var(--text-secondary)] whitespace-nowrap">Status</th>
            <th className="w-[20%] px-6 py-3 text-right font-semibold text-[var(--text-secondary)] whitespace-nowrap">Est. Cost</th>
            <th className="relative w-[5%] px-6 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {items.length === 0 ? (
            <tr>
               <td colSpan={5} className="px-6 py-10 text-center text-[var(--text-tertiary)]">
                No items match the current filter.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <Row
                key={item.id}
                item={item}
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