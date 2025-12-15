'use client';

import * as React from 'react';
import { Plus, Loader2, Filter } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import ConfirmDialog from '@/components/ConfirmDialog';
// Updated imports to new component names
import ShoppingTable from '@/components/shopping/ShoppingTable';
import ShoppingModal from '@/components/shopping/ShoppingModal';
// Updated imports to local actions
import {
  getShoppingItems,
  addShoppingItem,
  updateShoppingItemDetails,
  updateShoppingItemStatus,
  deleteShoppingItem,
  type ShoppingItem, // Importing the type
} from './actions';

// Define the type for the payload passed to the save action
type ShoppingItemPayload = Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status'>;

export default function ShoppingPage() {
  const { notify } = useToast();

  // --- State ---
  const [items, setItems] = React.useState<ShoppingItem[]>([]);
  const [filter, setFilter] = React.useState<'all' | 'to_buy' | 'bought'>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ShoppingItem | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete Confirmation State
  const [itemToDeleteId, setItemToDeleteId] = React.useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  // --- Data Fetching ---
  const fetchItems = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedItems = await getShoppingItems();
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
    } catch (error: any) {
      console.error('Error fetching shopping items:', error);
      notify({ 
        title: 'Error', 
        description: 'Could not load shopping list.', 
        variant: 'danger' 
      });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  React.useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // --- Calculations ---
  const totalPendingCost = React.useMemo(() => {
    return items.reduce((sum, item) => {
      // Only add cost if status is 'to_buy' and cost is a valid number
      if (item.status === 'to_buy' && typeof item.estimated_cost === 'number') {
        return sum + item.estimated_cost;
      }
      return sum;
    }, 0);
  }, [items]);

  // --- Filtered Items ---
  const filteredItems = React.useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(item => item.status === filter);
  }, [items, filter]);

  // --- Currency Formatting ---
  const formatCurrency = React.useCallback((amount: number | null | undefined): string => {
    if (amount == null) return '-';
    try {
      return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
    } catch (e) {
      console.error("Currency formatting failed:", e);
      return `RD$${amount.toFixed(2)}`; // Fallback
    }
  }, []);

  // --- Handlers ---

  const openAddModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (payload: ShoppingItemPayload) => {
    setIsSaving(true);
    const isEditing = !!editingItem;
    const action = isEditing ? updateShoppingItemDetails : addShoppingItem;
    const actionPayload = isEditing ? { ...payload, id: editingItem.id } : payload;
    const successMessage = isEditing ? 'Item updated successfully' : 'Item added successfully';

    try {
      const result = await action(actionPayload as any);
      
      if (!result.success) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'add'} item.`);
      }
      
      notify({ title: 'Success', description: successMessage, variant: 'success' });
      closeModal();
      await fetchItems(); // Re-fetch data to sync UI
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'saving'} item:`, error);
      notify({ 
        title: 'Error', 
        description: error.message || `Could not ${isEditing ? 'update' : 'save'} item.`, 
        variant: 'danger' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusToggle = async (itemId: string, currentStatus: 'to_buy' | 'bought') => {
    const newStatus = currentStatus === 'bought' ? 'to_buy' : 'bought';
    const originalItems = [...items];

    // Optimistic UI update
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, status: newStatus } : item));

    try {
      const result = await updateShoppingItemStatus({ id: itemId, status: newStatus });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update status.');
      }
      notify({ 
        title: 'Status Updated', 
        description: `Item marked as ${newStatus === 'to_buy' ? 'To Buy' : 'Bought'}.`, 
        variant: 'success' 
      });
      // No re-fetch needed here if optimistic update succeeds
    } catch (error: any) {
      console.error('Error updating item status:', error);
      notify({ title: 'Error Updating Status', description: error.message, variant: 'danger' });
      setItems(originalItems); // Revert UI on error
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    setIsConfirmOpen(false);
    setItemToDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;

    const itemToDelete = items.find(item => item.id === itemToDeleteId);
    const originalItems = [...items];
    const tempIdToDelete = itemToDeleteId;

    closeConfirmDialog();
    
    // Optimistic UI update
    setItems(prev => prev.filter(item => item.id !== tempIdToDelete));

    try {
      const result = await deleteShoppingItem({ id: tempIdToDelete });
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete item.');
      }
      notify({ 
        title: 'Item Deleted', 
        description: `"${itemToDelete?.description || 'Item'}" removed.`, 
        variant: 'success' 
      });
    } catch (error: any) {
      console.error('Error deleting item:', error);
      notify({ title: 'Error Deleting Item', description: error.message, variant: 'danger' });
      setItems(originalItems); // Revert UI on error
    }
  };

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">Shopping List</h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">Track items to purchase for your business</p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--primary-600)]"
          >
            <Plus size={18} /> Add Item
          </button>
        </div>

        {/* Total Pending Cost Box */}
        <div className="grid grid-cols-1">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-1)] inline-block max-w-md">
            <p className="text-sm text-[var(--text-secondary)]">Total Estimated Pending Cost</p>
            <p className="text-2xl font-bold text-[var(--warning)] mt-1">
              {formatCurrency(totalPendingCost)}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-start gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--text-tertiary)]" />
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border)] p-0.5 bg-[var(--bg-surface)]">
              <button onClick={() => setFilter('all')} className={`filter-button ${filter === 'all' && 'active'}`}>All</button>
              <button onClick={() => setFilter('to_buy')} className={`filter-button ${filter === 'to_buy' && 'active'}`}>To Buy</button>
              <button onClick={() => setFilter('bought')} className={`filter-button ${filter === 'bought' && 'active'}`}>Bought</button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)]">
          {isLoading ? (
            <div className="p-10 text-center text-[var(--text-secondary)] flex justify-center items-center gap-2 h-full">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading items...
            </div>
          ) : (
            <ShoppingTable
              items={filteredItems}
              onEdit={openEditModal}
              onDelete={handleDeleteClick}
              onStatusToggle={handleStatusToggle}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <ShoppingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editingItem}
        isEditing={!!editingItem}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Item?"
      >
        Are you sure you want to delete this item from your list? This action cannot be undone.
      </ConfirmDialog>

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