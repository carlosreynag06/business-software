// app/(app)/automations/AutomationsClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type { Automation, AutomationStatus } from './actions'
import {
  upsertAutomation,
  deleteAutomation,
  toggleAutomationStatus,
} from './actions'
import {
  Users,
  Search,
  Plus,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  Wand2,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
// NEW: Import the extracted components
import AutomationList from '@/components/automations/AutomationList'
import AutomationFormModal from '@/components/automations/AutomationFormModal'

/*
|--------------------------------------------------------------------------
| Types & Constants (Local to Client)
|--------------------------------------------------------------------------
*/

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
interface AutomationsClientProps {
  initialAutomations: Automation[]
}

export default function AutomationsClient({
  initialAutomations,
}: AutomationsClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- Data State ---
  const [automations, setAutomations] = useState(initialAutomations)

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  // --- Modal State ---
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null)
  const [automationToDelete, setAutomationToDelete] = useState<Automation | null>(null)

  // Sync server data (for router.refresh())
  useEffect(() => setAutomations(initialAutomations), [initialAutomations])

  // --- Memos for Filtered Data ---
  const filteredAutomations = useMemo(() => {
    return automations.filter((auto) => {
      const query = searchQuery.toLowerCase()

      // Filter by Search Query
      if (query) {
        const nameMatch = auto.name.toLowerCase().includes(query)
        const descMatch = auto.description.toLowerCase().includes(query)
        const triggerMatch = auto.trigger.toLowerCase().includes(query)
        if (!nameMatch && !descMatch && !triggerMatch) {
          return false
        }
      }

      // Filter by Active Status
      if (filterActive === 'active' && !auto.isActive) {
        return false
      }
      if (filterActive === 'inactive' && auto.isActive) {
        return false
      }

      return true
    })
  }, [automations, searchQuery, filterActive])

  // --- Handlers ---
  const handleOpenAddModal = () => {
    setEditingAutomation(null)
    setIsFormModalOpen(true)
  }

  const handleOpenEditModal = (auto: Automation) => {
    setEditingAutomation(auto)
    setIsFormModalOpen(true)
  }

  const handleOpenDeleteConfirm = (auto: Automation) => {
    setAutomationToDelete(auto)
  }

  // Handle Save (Add & Edit)
  const handleSaveAutomation = (formData: any) => {
      startTransition(async () => {
      const isEditing = !!formData.id
      const actionType = isEditing ? 'Updated' : 'Created'
      
      const result = await upsertAutomation(formData);

      if (result.success) {
        notify({
          title: `Automation ${actionType}`,
          description: `"${result.data?.name}" has been saved.`,
          variant: 'success',
        })
        setIsFormModalOpen(false)
        setEditingAutomation(null)
        router.refresh()
      } else {
          notify({
          title: 'Save Failed',
          description: result.error || 'Could not save the automation.',
          variant: 'danger',
        })
      }
    })
  }

  const handleToggle = (id: string, newIsActive: boolean) => {
    startTransition(async () => {
      const result = await toggleAutomationStatus(id, newIsActive);
      if (result.success) {
        notify({
          title: newIsActive ? 'Automation Activated' : 'Automation Deactivated',
          variant: 'success',
        })
        router.refresh()
      } else {
          notify({
          title: 'Error',
          description: result.error || 'Could not update automation status.',
          variant: 'danger',
        })
      }
    })
  }
  
  const handleViewLog = (auto: Automation) => {
      if (auto.lastRunStatus === 'error') {
        notify({
          title: `Error Log: ${auto.name}`,
          description: auto.lastRunError || 'An unknown error occurred. (Mock error)',
          variant: 'danger',
          duration: 10000,
        })
      } else {
        notify({
          title: `Log: ${auto.name}`,
          description: 'Automation ran successfully. (Mock log)',
          variant: 'info',
        })
      }
  }

  const handleConfirmDelete = () => {
    if (!automationToDelete) return
    const autoId = automationToDelete.id

    startTransition(async () => {
      const result = await deleteAutomation(autoId);

      if (result.success) {
        notify({
          title: 'Automation Deleted',
          description: `The automation "${automationToDelete.name}" has been deleted.`,
          variant: 'success',
        })
        setAutomationToDelete(null)
        router.refresh()
      } else {
        notify({
          title: 'Delete Failed',
          description: result.error || 'Could not delete the automation.',
          variant: 'danger',
        })
        setAutomationToDelete(null)
      }
    })
  }

  return (
    <>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Automations
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Manage automated workflows for your business
            </p>
          </div>
          <Button onClick={handleOpenAddModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            New Automation
          </Button>
        </div>

        {/* 2. Filter Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 flex-1 items-center gap-3">
            {/* UPDATED: Added min-w-[200px] to search wrapper */}
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder="Search by name, description, or trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) =>
                setFilterActive(e.target.value as 'all' | 'active' | 'inactive')
              }
              className={clsx(inputBaseClass, 'w-48 appearance-none')} /* Added appearance-none */
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* 3. Content Area - MODIFIED: Removed border */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
          <AutomationList
            automations={filteredAutomations}
            onToggle={handleToggle}
            onViewLog={handleViewLog}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteConfirm}
            isPending={isPending}
          />
        </div>
      </div>

      {/* Modals & Dialogs */}
      <AutomationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveAutomation}
        initialData={editingAutomation}
        isSaving={isPending}
      />

      <ConfirmDialog
        isOpen={!!automationToDelete}
        onClose={() => setAutomationToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Automation"
      >
        Are you sure you want to delete the automation
        <strong> "{automationToDelete?.name}"</strong>? This action cannot be
        undone.
      </ConfirmDialog>
    </>
  )
}