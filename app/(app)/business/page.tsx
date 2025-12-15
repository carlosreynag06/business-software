'use client';

import * as React from 'react';
import { Plus, Loader2, Filter, Info } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
import ExpenseTable from '@/components/business/ExpenseTable'; // Renamed import
import ExpenseModal from '@/components/business/ExpenseModal'; // Renamed import
import type { BusinessSimExpense } from '@/lib/business.types'; // Updated type import

import {
  getSimExpenses,
  addSimExpense,
  updateSimExpense,
  updateSimExpenseStatus,
  deleteSimExpense,
} from './actions';

// Define the type for the payload passed to the save action
type SimExpensePayload = Omit<BusinessSimExpense, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>;

export default function BusinessSimulationPage() {
  const { notify } = useToast();

  // --- State ---
  const [expenses, setExpenses] = React.useState<BusinessSimExpense[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'one_time' | 'recurring'>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<BusinessSimExpense | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete Confirmation State
  const [expenseToDeleteId, setExpenseToDeleteId] = React.useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  // --- Data Fetching ---
  const fetchExpenses = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedExpenses = await getSimExpenses();
      setExpenses(Array.isArray(fetchedExpenses) ? fetchedExpenses : []);
    } catch (error: any) {
      console.error('Error fetching sim expenses:', error);
      notify({ 
        title: 'Error', 
        description: 'Could not load simulation data.', 
        variant: 'danger' 
      });
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // --- Calculations ---
  const {
    totalPendingOneTimeCosts,
    totalMonthlyRecurringCosts,
  } = React.useMemo(() => {
    let oneTime = 0;
    let recurring = 0;

    for (const expense of expenses) {
      if (expense.expense_type === 'one_time' && expense.status === 'pending') {
        oneTime += expense.amount || 0;
      } else if (expense.expense_type === 'recurring') {
        recurring += expense.amount || 0;
      }
    }

    return {
      totalPendingOneTimeCosts: oneTime,
      totalMonthlyRecurringCosts: recurring,
    };
  }, [expenses]);

  // --- Filtered Expenses ---
  const filteredExpenses = React.useMemo(() => {
    if (filter === 'all') return expenses;
    return expenses.filter(exp => exp.expense_type === filter);
  }, [expenses, filter]);

  // --- Currency Formatting ---
  const formatCurrency = React.useCallback((amount: number): string => {
    try {
      return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
    } catch (e) {
      console.error("Currency formatting failed:", e);
      return `RD$${amount.toFixed(2)}`; // Fallback
    }
  }, []);

  // --- Handlers ---

  const openAddModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const openEditModal = (expense: BusinessSimExpense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSave = async (payload: SimExpensePayload) => {
    setIsSaving(true);
    const isEditing = !!editingExpense;
    const action = isEditing ? updateSimExpense : addSimExpense;
    const actionPayload = isEditing ? { ...payload, id: editingExpense.id } : payload;
    const successMessage = isEditing ? 'Sim Expense updated' : 'Sim Expense added';

    try {
      const result = await action(actionPayload as any);
      
      if (!result.success) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} sim expense.`);
      }
      
      notify({ title: 'Success', description: successMessage, variant: 'success' });
      closeModal();
      await fetchExpenses(); // Re-fetch data to sync UI
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'saving'} sim expense:`, error);
      notify({ 
        title: 'Error', 
        description: error.message || `Could not ${isEditing ? 'update' : 'save'} sim expense.`, 
        variant: 'danger' 
      });
      // Keep modal open on error so user doesn't lose input
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = async (expenseId: string, currentStatus: 'pending' | 'paid') => {
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    const originalExpenses = [...expenses];

    // Optimistic UI update
    setExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, status: newStatus } : exp));

    try {
      const result = await updateSimExpenseStatus({ id: expenseId, status: newStatus });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status.');
      }
      notify({ title: 'Status Updated', description: `Expense marked as ${newStatus}.`, variant: 'success' });
      // No re-fetch needed here if optimistic update succeeds
    } catch (error: any) {
      console.error('Error updating sim status:', error);
      notify({ title: 'Error Updating Status', description: error.message, variant: 'danger' });
      setExpenses(originalExpenses); // Revert UI on error
    }
  };

  const handleDeleteClick = (id: string) => {
    setExpenseToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    setIsConfirmOpen(false);
    setExpenseToDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDeleteId) return;

    const expenseToDelete = expenses.find(exp => exp.id === expenseToDeleteId);
    const originalExpenses = [...expenses];
    const tempIdToDelete = expenseToDeleteId;

    closeConfirmDialog();
    
    // Optimistic UI update
    setExpenses(prev => prev.filter(exp => exp.id !== tempIdToDelete));

    try {
      const result = await deleteSimExpense({ id: tempIdToDelete });
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete sim expense.');
      }
      notify({ 
        title: 'Expense Deleted', 
        description: `"${expenseToDelete?.description || 'Expense'}" removed.`, 
        variant: 'success' 
      });
    } catch (error: any) {
      console.error('Error deleting sim expense:', error);
      notify({ title: 'Error Deleting Expense', description: error.message, variant: 'danger' });
      setExpenses(originalExpenses); // Revert UI on error
    }
  };

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">Business Simulation</h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">Model potential business expenses</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--primary-600)]"
          >
            <Plus size={18} /> Add Expense
          </button>
        </div>

        {/* Capital & Summary Boxes */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Pending One-Time Costs */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
            <p className="text-sm text-[var(--text-secondary)]">Pending One-Time Costs</p>
            <p className="text-2xl font-bold text-[var(--warning)] mt-1">
              {formatCurrency(totalPendingOneTimeCosts)}
            </p>
          </div>

          {/* Monthly Recurring Costs */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)]">
            <p className="text-sm text-[var(--text-secondary)]">Total Monthly Recurring Costs</p>
            <p className="text-2xl font-bold text-[var(--danger)] mt-1">
              {formatCurrency(totalMonthlyRecurringCosts)}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-start gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--text-tertiary)]" />
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] p-0.5 bg-[var(--bg-surface)]">
              <button onClick={() => setFilter('all')} className={`filter-button ${filter === 'all' && 'active'}`}>All</button>
              <button onClick={() => setFilter('one_time')} className={`filter-button ${filter === 'one_time' && 'active'}`}>One-Time</button>
              <button onClick={() => setFilter('recurring')} className={`filter-button ${filter === 'recurring' && 'active'}`}>Recurring</button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)]">
          {isLoading ? (
            <div className="p-10 text-center text-[var(--text-secondary)] flex justify-center items-center gap-2 h-full">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading expenses...
            </div>
          ) : (
            <ExpenseTable
              expenses={filteredExpenses}
              onEdit={openEditModal}
              onDelete={handleDeleteClick}
              onStatusToggle={handleStatusToggle}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editingExpense}
        isEditing={!!editingExpense}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Simulated Expense?"
      >
        Are you sure you want to delete this simulated expense? This action cannot be undone.
      </ConfirmDialog>

      {/* Add local styles for filter buttons */}
      <style jsx>{`
        .filter-button {
          padding: 4px 12px;
          border-radius: 6px; /* --radius-sm */
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 150ms;
          color: var(--text-secondary);
        }
        .filter-button:hover {
          color: var(--text-primary);
        }
        .filter-button.active {
          background-color: var(--bg-muted);
          color: var(--text-primary);
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
      `}</style>
    </>
  );
}