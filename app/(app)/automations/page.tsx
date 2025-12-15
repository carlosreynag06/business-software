// app/(app)/automations/page.tsx
import * as React from 'react'
import { getAutomations } from './actions'
import AutomationsClient from './AutomationsClient'
import type { Automation } from './actions'

export default async function AutomationsServerPage() {
  // Fetch data on the server
  const initialData = await getAutomations()

  // Safe fallback
  const safeAutomations: Automation[] = Array.isArray(initialData)
    ? initialData
    : []

  return <AutomationsClient initialAutomations={safeAutomations} />
}