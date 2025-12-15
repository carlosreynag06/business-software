// app/(app)/automations/actions.ts
'use server'

import { revalidatePath } from 'next/cache'

/*
|--------------------------------------------------------------------------
| Types (Mirrored from Client)
|--------------------------------------------------------------------------
*/
export type AutomationStatus = 'success' | 'error' | 'never'

export interface Automation {
  id: string
  name: string
  description: string
  trigger: string
  isActive: boolean
  lastRun: string | null
  lastRunStatus: AutomationStatus
}

/*
|--------------------------------------------------------------------------
| Mock Data
|--------------------------------------------------------------------------
*/

let mockAutomations: Automation[] = [
  {
    id: 'auto-1',
    name: 'Send Welcome Email to New Leads',
    description: 'When a new lead is created, send the "Welcome" email template.',
    trigger: 'On "Lead" stage entry',
    isActive: true,
    lastRun: new Date('2025-11-05T14:30:00Z').toISOString(),
    lastRunStatus: 'success',
  },
  {
    id: 'auto-2',
    name: 'Follow-up on Stale Discovery Leads',
    description:
      'If a lead is in "Discovery" for 7+ days, send a follow-up email.',
    trigger: 'Daily at 9:00 AM',
    isActive: true,
    lastRun: new Date('2025-11-06T09:00:05Z').toISOString(),
    lastRunStatus: 'error',
  },
  {
    id: 'auto-3',
    name: 'Notify on Project "Blocked"',
    description:
      'When a project status is changed to "Blocked", send a high-priority notification.',
    trigger: 'On "Project" status change',
    isActive: true,
    lastRun: new Date('2025-11-01T10:15:00Z').toISOString(),
    lastRunStatus: 'success',
  },
  {
    id: 'auto-4',
    name: 'Send Class Renewal Reminders',
    description:
      'When a student has 2 sessions left in their package, send a renewal email.',
    trigger: 'On "Class Session" completion',
    isActive: false,
    lastRun: null,
    lastRunStatus: 'never',
  },
]

/*
|--------------------------------------------------------------------------
| Server Actions
|--------------------------------------------------------------------------
*/

/**
 * MOCK: Fetches all automations.
 */
export async function getAutomations(): Promise<Automation[]> {
  console.log('MOCK: Fetching all automations...')
  await new Promise((resolve) => setTimeout(resolve, 300))
  return mockAutomations
}

/**
 * MOCK: Toggles an automation's active status.
 */
export async function toggleAutomationStatus(
  id: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  console.log(`MOCK: Toggling automation ${id} to ${isActive}`)
  await new Promise((resolve) => setTimeout(resolve, 400))

  const index = mockAutomations.findIndex((a) => a.id === id)
  if (index !== -1) {
    mockAutomations[index].isActive = isActive
    revalidatePath('/automations')
    return { success: true }
  }
  return { success: false, error: 'Automation not found.' }
}

/**
 * MOCK: Adds or updates an automation (Not used by client yet).
 */
export async function upsertAutomation(
  formData: any,
): Promise<{ success: boolean; error?: string; data?: Automation }> {
  console.log('MOCK: Upserting automation...', formData)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const isEditing = !!formData.id

  if (isEditing) {
    // Update logic
    const updatedAutomation = { ...formData } as Automation
    mockAutomations = mockAutomations.map((a) =>
      a.id === formData.id ? updatedAutomation : a,
    )
    revalidatePath('/automations')
    return { success: true, data: updatedAutomation }
  } else {
    // Create logic
    const newAutomation: Automation = {
      ...formData,
      id: `auto-${Math.random().toString(36).slice(2, 9)}`,
      isActive: formData.isActive || false,
      lastRun: null,
      lastRunStatus: 'never',
    }
    mockAutomations.unshift(newAutomation)
    revalidatePath('/automations')
    return { success: true, data: newAutomation }
  }
}

/**
 * MOCK: Deletes an automation.
 */
export async function deleteAutomation(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Deleting automation...', id)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const index = mockAutomations.findIndex((a) => a.id === id)
  if (index !== -1) {
    mockAutomations.splice(index, 1)
    revalidatePath('/automations')
    return { success: true }
  } else {
    return { success: false, error: 'Automation not found.' }
  }
}