// app/(app)/social-media/actions.ts
'use server'

import type {
  SocialMediaCampaign,
  ContentCalendarItem,
  MarketingChannel,
  CampaignStatus,
  ContentStatus,
  Lead,
  Contact,
} from '@/lib/types'
import { revalidatePath } from 'next/cache'

/*
|--------------------------------------------------------------------------
| Mock Data
|--------------------------------------------------------------------------
| Simulates the database, linking Contacts -> Leads -> Campaigns -> Content
*/

// --- 1. Mock Contacts & Leads ---
// Not strictly required, but good for linking campaigns to a lead/contact
const mockContacts: Record<string, Contact> = {
  c30: {
    id: 'c30',
    fullName: 'Pizzeria Bella',
    email: 'info@bellapizza.com',
    preferredChannel: 'email',
    createdAt: '2025-01-10T10:00:00Z',
  },
  c31: {
    id: 'c31',
    fullName: 'Gimnasio Fuerte',
    email: 'info@gimnasiofuerte.com',
    preferredChannel: 'whatsapp',
    createdAt: '2025-03-12T11:00:00Z',
  },
}

const mockLeads: Record<string, Lead> = {
  l30: {
    id: 'l30',
    contactId: 'c30',
    serviceType: 'social_media',
    sourceChannel: 'referral',
    currentStage: 'delivery', // 'delivery' for an active campaign
    stageTs: {
      lead: '2025-01-10T10:00:00Z',
      discovery: '2025-01-12T11:00:00Z',
      delivery: '2025-02-01T14:00:00Z',
    },
    expectedValue: 45000,
    contact: mockContacts.c30,
    createdAt: '2025-01-10T10:00:00Z',
  },
  l31: {
    id: 'l31',
    contactId: 'c31',
    serviceType: 'social_media',
    sourceChannel: 'google_ads',
    currentStage: 'planning', // 'planning' for a campaign in planning
    stageTs: {
      lead: '2025-03-12T11:00:00Z',
    },
    expectedValue: 30000,
    contact: mockContacts.c31,
    createdAt: '2025-03-12T11:00:00Z',
  },
}

// --- 2. Mock Social Media Campaigns ---
let mockCampaigns: SocialMediaCampaign[] = [
  {
    id: 'camp1',
    leadId: 'l30',
    brandAccount: 'Pizzeria Bella',
    channels: ['instagram', 'facebook'],
    goals: 'Aumentar pedidos a domicilio un 20%',
    budgetTotal: 15000,
    currency: 'DOP',
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    status: 'active',
  },
  {
    id: 'camp2',
    leadId: 'l31',
    brandAccount: 'Gimnasio Fuerte',
    channels: ['instagram', 'tiktok'],
    goals: 'Conseguir 100 nuevos inscritos para el reto de Enero.',
    budgetTotal: 25000,
    currency: 'DOP',
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    status: 'planning',
  },
  {
    id: 'camp3',
    leadId: 'l-old',
    brandAccount: 'Tienda Local',
    channels: ['facebook'],
    goals: 'Promoción de verano.',
    budgetTotal: 10000,
    currency: 'DOP',
    startDate: '2025-07-01',
    endDate: '2025-07-31',
    status: 'completed',
  },
]

// --- 3. Mock Content Calendar Items ---
// Helper to get dates relative to today
const getISODateTime = (dayOffset: number, hour: number) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

let mockContentItems: ContentCalendarItem[] = [
  // Pizzeria Bella (Active)
  {
    id: 'post1',
    campaignId: 'camp1',
    channel: 'instagram',
    publishDatetime: getISODateTime(0, 12), // Today @ 12 PM
    caption: '¡Hoy! 2x1 en pizzas medianas. Pide por DM.',
    status: 'posted',
    linkToPost: 'https://instagram.com/p/123',
  },
  {
    id: 'post2',
    campaignId: 'camp1',
    channel: 'facebook',
    publishDatetime: getISODateTime(1, 18), // Tomorrow @ 6 PM
    caption: 'Nuestro nuevo "Volcano" de queso. ¿Te atreves?',
    status: 'approved',
  },
  {
    id: 'post3',
    campaignId: 'camp1',
    channel: 'instagram',
    publishDatetime: getISODateTime(2, 12), // In 2 days @ 12 PM
    caption: 'Sorteo: Gana una cena para dos. Comenta y etiqueta.',
    status: 'planned', // Needs approval
  },
  // Gimnasio Fuerte (Planning)
  {
    id: 'post4',
    campaignId: 'camp2',
    channel: 'tiktok',
    publishDatetime: getISODateTime(5, 19), // In 5 days @ 7 PM
    caption: '¡El reto de Enero se acerca! ¿Listo para transformar tu vida?',
    status: 'planned',
  },
  {
    id: 'post5',
    campaignId: 'camp2',
    channel: 'instagram',
    publishDatetime: getISODateTime(6, 10), // In 6 days @ 10 AM
    caption: 'Conoce a nuestros entrenadores. #TeamFuerte',
    status: 'planned',
  },
]

/*
|--------------------------------------------------------------------------
| Server Actions
|--------------------------------------------------------------------------
*/

/**
 * MOCK: Fetches all data needed for the social media page
 */
export async function getSocialMediaData(): Promise<{
  campaigns: SocialMediaCampaign[]
  contentItems: ContentCalendarItem[]
  kpis: {
    activeCampaigns: number
    scheduledPosts: number
    needsApproval: number
  }
}> {
  console.log('MOCK: Fetching all social media data...')
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Calculate KPIs
  const activeCampaigns = mockCampaigns.filter(
    (c) => c.status === 'active',
  ).length
  const now = new Date()
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  
  const scheduledPosts = mockContentItems.filter((item) => {
    const publishDate = new Date(item.publishDatetime)
    return (
      (item.status === 'planned' || item.status === 'approved') &&
      publishDate > now &&
      publishDate <= nextWeek
    )
  }).length
  
  const needsApproval = mockContentItems.filter(
    (item) => item.status === 'planned',
  ).length

  return {
    campaigns: mockCampaigns,
    contentItems: mockContentItems,
    kpis: {
      activeCampaigns,
      scheduledPosts,
      needsApproval,
    },
  }
}

/**
 * MOCK: Adds or updates a campaign
 */
export async function upsertCampaign(
  formData: any,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Upserting campaign...', formData)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const isEditing = !!formData.id
  if (isEditing) {
    mockCampaigns = mockCampaigns.map((c) =>
      c.id === formData.id ? { ...c, ...formData } : c,
    )
  } else {
    const newCampaign: SocialMediaCampaign = {
      ...formData,
      id: `camp${Math.floor(Math.random() * 10000)}`,
      currency: 'DOP', // Default
    }
    mockCampaigns.unshift(newCampaign)
  }

  revalidatePath('/social-media')
  return { success: true }
}

/**
 * MOCK: Deletes a campaign
 */
export async function deleteCampaign(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Deleting campaign...', id)
  await new Promise((resolve) => setTimeout(resolve, 500))
  mockCampaigns = mockCampaigns.filter((c) => c.id !== id)
  // Also delete associated content
  mockContentItems = mockContentItems.filter((item) => item.campaignId !== id)
  revalidatePath('/social-media')
  return { success: true }
}

/**
 * MOCK: Adds or updates a content calendar item
 */
export async function upsertContentItem(
  formData: any,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Upserting content item...', formData)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const isEditing = !!formData.id
  if (isEditing) {
    mockContentItems = mockContentItems.map((item) =>
      item.id === formData.id ? { ...item, ...formData } : item,
    )
  } else {
    const newItem: ContentCalendarItem = {
      ...formData,
      id: `post${Math.floor(Math.random() * 10000)}`,
    }
    mockContentItems.push(newItem)
  }

  revalidatePath('/social-media')
  return { success: true }
}

/**
 * MOCK: Deletes a content calendar item
 */
export async function deleteContentItem(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  console.log('MOCK: Deleting content item...', id)
  await new Promise((resolve) => setTimeout(resolve, 500))
  mockContentItems = mockContentItems.filter((item) => item.id !== id)
  revalidatePath('/social-media')
  return { success: true }
}