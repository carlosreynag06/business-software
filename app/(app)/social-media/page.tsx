// app/(app)/social-media/page.tsx
import * as React from 'react'
import { getSocialMediaData } from './actions'
import SocialMediaClient from './SocialMediaClient'
import type {
  SocialMediaCampaign,
  ContentCalendarItem,
} from '@/lib/types'

export default async function SocialMediaPage() {
  // Fetch data on the server
  const initialData = await getSocialMediaData()

  // Safe fallbacks
  const safeCampaigns: SocialMediaCampaign[] = Array.isArray(
    initialData?.campaigns,
  )
    ? initialData.campaigns
    : []

  const safeContentItems: ContentCalendarItem[] = Array.isArray(
    initialData?.contentItems,
  )
    ? initialData.contentItems
    : []

  const safeKpis = initialData?.kpis ?? {
    activeCampaigns: 0,
    scheduledPosts: 0,
    needsApproval: 0,
  }

  return (
    <SocialMediaClient
      initialCampaigns={safeCampaigns}
      initialContentItems={safeContentItems}
      initialKpis={safeKpis}
    />
  )
}