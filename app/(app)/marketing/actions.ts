// app/(app)/marketing/actions.ts
'use server'

import type {
  MarketingTouch,
  Lead,
  Contact,
  MarketingChannel,
  TouchType,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

/*
|--------------------------------------------------------------------------
| Mock Data
|--------------------------------------------------------------------------
| Based on My Business Software.pdf specifications
*/

// --- 1. Mock Contacts ---
const mockContacts: Record<string, Contact> = {
  c1: {
    id: 'c1',
    fullName: 'Ana Gómez',
    email: 'ana.gomez@example.com',
    preferredChannel: 'whatsapp',
    createdAt: '2025-10-01T10:00:00Z',
  },
  c2: {
    id: 'c2',
    fullName: 'Carlos Fernandez',
    email: 'c.fernandez@example.com',
    preferredChannel: 'email',
    createdAt: '2025-10-05T14:30:00Z',
  },
  c3: {
    id: 'c3',
    fullName: 'Maria Rodriguez',
    email: 'm.rod@example.com',
    preferredChannel: 'whatsapp',
    createdAt: '2025-10-10T09:15:00Z',
  },
}

// --- 2. Mock Leads (to link touches to) ---
const mockLeads: Record<string, Lead> = {
  l001: {
    id: 'l-001',
    contactId: 'c1',
    serviceType: 'website',
    sourceChannel: 'instagram',
    currentStage: 'lead',
    stageTs: { lead: '2025-11-05T10:00:00Z' },
    expectedValue: 180000,
    contact: mockContacts.c1,
    createdAt: '2025-11-05T10:00:00Z',
  },
  l003: {
    id: 'l-003',
    contactId: 'c3',
    serviceType: 'english_class',
    sourceChannel: 'google_ads',
    currentStage: 'lead',
    stageTs: { lead: '2025-11-02T09:15:00Z' },
    expectedValue: 18000,
    contact: mockContacts.c3,
    createdAt: '2025-11-02T09:15:00Z',
  },
}

// --- 3. Mock Marketing Touches ---
let mockTouches: MarketingTouch[] = [
  {
    id: 'mt-1',
    contactId: 'c1', // Ana Gómez
    channel: 'instagram',
    touchType: 'click',
    utmSource: 'ig_bio_link',
    utmCampaign: 'fall_promo_2025',
    cost: 0,
    timestamp: '2025-11-05T09:58:00Z',
  },
  {
    id: 'mt-2',
    contactId: 'c3', // Maria Rodriguez
    channel: 'google_ads',
    touchType: 'form',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'english_classes_sdq',
    cost: 150.0, // RD$ 150.00
    timestamp: '2025-11-02T09:14:30Z',
  },
  {
    id: 'mt-3',
    contactId: 'c1', // Ana Gómez
    channel: 'instagram',
    touchType: 'impression',
    utmSource: 'ig_stories',
    utmCampaign: 'fall_promo_2025',
    cost: 0,
    timestamp: '2025-11-04T15:30:00Z',
  },
  {
    id: 'mt-4',
    contactId: 'c2', // Carlos Fernandez
    channel: 'organic',
    touchType: 'visit',
    cost: 0,
    timestamp: '2025-11-01T11:20:00Z',
  },
  {
    id: 'mt-5',
    contactId: 'c3', // Maria Rodriguez
    channel: 'google_ads',
    touchType: 'click',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'english_classes_sdq',
    cost: 150.0, // RD$ 150.00
    timestamp: '2025-11-01T10:00:00Z',
  },
]

/*
|--------------------------------------------------------------------------
| Server Actions
|--------------------------------------------------------------------------
*/

/**
 * MOCK: Fetches all data needed for the marketing page.
 * Returns touches, plus leads and contacts for linking.
 */
export async function getMarketingData(): Promise<{
  touches: MarketingTouch[]
  leads: Lead[]
  contacts: Contact[]
} | null> {
  console.log('MOCK: Fetching all marketing touches, leads, and contacts...')
  await new Promise((resolve) => setTimeout(resolve, 300))

  // In a real app, leads and contacts would be fetched to link names
  return {
    touches: mockTouches.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ),
    leads: Object.values(mockLeads),
    contacts: Object.values(mockContacts),
  }
}

/**
 * MOCK: Adds or updates a marketing touch.
 */
export async function upsertMarketingTouch(
  formData: any,
): Promise<{ success: boolean; error?: string; data?: MarketingTouch }> {
  console.log('MOCK: Upserting marketing touch...', formData)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const isEditing = !!formData.id

  if (isEditing) {
    // Update logic
    const updatedTouch = { ...formData } as MarketingTouch
    mockTouches = mockTouches.map((t) =>
      t.id === formData.id ? updatedTouch : t,
    )
    revalidatePath('/marketing')
    return { success: true, data: updatedTouch }
  } else {
    // Create logic
    const newTouch: MarketingTouch = {
      ...formData,
      id: `mt-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    }
    mockTouches.unshift(newTouch)
    revalidatePath('/marketing')
    return { success: true, data: newTouch }
  }
}

/**
 * MOCK: Deletes a marketing touch.
 */
export async function deleteMarketingTouch(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Deleting marketing touch...', id)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const index = mockTouches.findIndex((t) => t.id === id)
  if (index !== -1) {
    mockTouches.splice(index, 1)
    revalidatePath('/marketing')
    return { success: true }
  } else {
    return { success: false, error: 'Touchpoint not found.' }
  }
}