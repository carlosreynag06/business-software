// app/(app)/marketing/page.tsx
import * as React from 'react'
import { getMarketingData } from './actions'
import MarketingClient from './MarketingClient'
import type { MarketingTouch, Lead, Contact } from '@/lib/types'

export default async function MarketingServerPage() {
  // Fetch data on the server
  const initialData = await getMarketingData()

  // Safe fallbacks
  const safeTouches: MarketingTouch[] = Array.isArray(initialData?.touches)
    ? initialData.touches
    : []
  const safeLeads: Lead[] = Array.isArray(initialData?.leads)
    ? initialData.leads
    : []
  const safeContacts: Contact[] = Array.isArray(initialData?.contacts)
    ? initialData.contacts
    : []

  return (
    <MarketingClient
      initialTouches={safeTouches}
      initialLeads={safeLeads}
      initialContacts={safeContacts}
    />
  )
}