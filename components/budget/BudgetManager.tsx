'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import type { Snapshot } from '@/lib/types';
import TotalsDisplay from '@/components/budget/TotalsDisplay';
import BudgetTable from '@/components/budget/BudgetTable';
import EntryFormModal from '@/components/budget/EntryFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ChevronDown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Props = {
  initialSnapshotThis: Snapshot;
  initialSnapshotNext: Snapshot;
  month_start: string;
  month_end: string;
  next_month_start: string;
  next_month_end: string;
  today_local: string;
  monthLabelThis: string;
  monthLabelNext: string;
};

export default function BudgetManager({
  initialSnapshotThis,
  initialSnapshotNext,
  month_start,
  month_end,
  next_month_start,
  next_month_end,
  today_local,
  monthLabelThis,
  monthLabelNext,
}: Props) {
  const { notify } = useToast();
  const router = useRouter();

  // State
  const [snapshotThis, setSnapshotThis] = useState<Snapshot | null>(initialSnapshotThis);
  const [snapshotNext, setSnapshotNext] = useState<Snapshot | null>(initialSnapshotNext);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalInitial, setModalInitial] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<null | (() => Promise<void>)>(null);

  // Collapsible sections state
  const [showThis, setShowThis] = useState(true);
  const [showNext, setShowNext] = useState(true);

  useEffect(() => {
    setSnapshotThis(initialSnapshotThis);
    setSnapshotNext(initialSnapshotNext);
  }, [initialSnapshotThis, initialSnapshotNext]);

  // Modal Handlers
  const openAddModal = () => {
    setModalInitial(null);
    setModalOpen(true);
  };

  const openEditModal = (initial: any) => {
    setModalInitial(initial);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalInitial(null);
  };

  const handleMutationComplete = (msg?: string) => {
    if (msg) notify({ title: 'Success', description: msg, variant: 'success' });
    closeModal();
    setConfirmOpen(false); // Close confirm dialog as well
    router.refresh(); // Refresh server-fetched data
  };

  // Confirmation Dialog Handlers
  const onRequestConfirm = (opts: { message: string; action: () => Promise<void> }) => {
    setConfirmMessage(opts.message);
    setConfirmAction(() => opts.action); // Store the action function correctly
    setConfirmOpen(true);
  };

  const onConfirm = async () => {
    if (confirmAction) {
      await confirmAction(); // Execute the stored action
      // handleMutationComplete is called by the action's FormWatcher onDone
    }
    setConfirmOpen(false); // Close after action attempt
    setConfirmAction(null);
    setConfirmMessage('');
  };

  const onCancel = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
    setConfirmMessage('');
  };

  // Calculate Overdue Count
  const overdueCountThis = useMemo(() => {
    if (!snapshotThis) return 0;
    return snapshotThis.rows.filter(
      (r) => r.type === 'expense' && !r.is_paid && r.effective_date < today_local
    ).length;
  }, [snapshotThis, today_local]);

  const sectionContentVariants = {
    collapsed: { height: 0, opacity: 0, marginTop: 0, overflow: 'hidden' },
    open: { height: 'auto', opacity: 1, marginTop: '1.5rem', overflow: 'visible' },
  };

  return (
    <>
      {/* HEADER MOVED HERE TO FIX LAYOUT OVERLAP */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[var(--fs-h1)] font-bold tracking-tight text-[var(--text-primary)]">
            Budget
          </h1>
          <p className="text-[var(--text-secondary)]">
            Track your income and expenses to manage your finances.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--primary-600)] self-start sm:self-auto"
        >
          <Plus size={18} /> Add Transaction
        </button>
      </div>

      {/* MOVED TotalsDisplay OUTSIDE the collapsible sections, below the header */}
      {snapshotThis && (
        <div className="mb-8">
           <TotalsDisplay totals={snapshotThis.totals} />
        </div>
      )}

      <div className="space-y-6">
        {/* THIS MONTH SECTION */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-1)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowThis((s) => !s)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left font-semibold border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            aria-expanded={showThis}
          >
            <div className="flex items-center gap-3">
              <span className="text-[var(--fs-h4)]">{monthLabelThis}</span>
              {overdueCountThis > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: 'var(--danger)', color: 'white' }}
                >
                  {overdueCountThis} Overdue
                </span>
              )}
            </div>
            <ChevronDown
              size={20}
              className={`transition-transform text-[var(--text-secondary)] ${
                showThis ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {showThis && (
              <motion.section
                key="content-this"
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={sectionContentVariants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-[var(--bg-muted)] px-6 pb-6"
              >
                {snapshotThis ? (
                  <>
                    {/* REMOVED TotalsDisplay from here */}
                    {/* <div className="mt-6" />  Removed spacer too */}
                    <BudgetTable
                      rows={snapshotThis.rows}
                      today_local={today_local}
                      onEdit={openEditModal}
                      onRequestConfirm={onRequestConfirm}
                      onAfterMutation={handleMutationComplete}
                    />
                  </>
                ) : (
                  <div className="p-6 text-center text-[var(--text-secondary)]">Loading...</div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* NEXT MONTH SECTION */}
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-1)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowNext((s) => !s)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left font-semibold border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
            aria-expanded={showNext}
          >
            <span className="text-[var(--fs-h4)]">{monthLabelNext}</span>
            <ChevronDown
              size={20}
              className={`transition-transform text-[var(--text-secondary)] ${
                showNext ? 'rotate-0' : '-rotate-90'
              }`}
            />
          </button>
          <AnimatePresence initial={false}>
            {showNext && (
              <motion.section
                key="content-next"
                initial="collapsed"
                animate="open"
                exit="collapsed"
                variants={sectionContentVariants}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="bg-[var(--bg-muted)] px-6 pb-6"
              >
                {snapshotNext ? (
                  <>
                      {/* REMOVED TotalsDisplay from here (Next Month totals usually less relevant or can be added back if desired) */}
                      {/* <TotalsDisplay totals={snapshotNext.totals} /> */}
                    {/* <div className="mt-6" /> */}
                    <BudgetTable
                      rows={snapshotNext.rows}
                      today_local={today_local}
                      onEdit={openEditModal}
                      onRequestConfirm={onRequestConfirm}
                      onAfterMutation={handleMutationComplete}
                    />
                  </>
                ) : (
                  <div className="p-6 text-center text-[var(--text-secondary)]">Loading...</div>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      <EntryFormModal
        open={modalOpen}
        initial={modalInitial}
        onClose={closeModal}
        onSaved={handleMutationComplete}
        today_local={today_local}
      />
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={onCancel}
        onConfirm={onConfirm}
        title="Are you sure?"
      >
        {confirmMessage}
      </ConfirmDialog>
    </>
  );
}