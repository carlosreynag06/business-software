// app/(app)/inmigration-services/page.tsx
import * as React from 'react'
import { getCases } from './actions'
import InmigrationClient from './InmigrationClient' // CORRECTED
import type { InmigrationCaseUI } from '@/lib/inmigration.types' // CORRECTED

export default async function InmigrationServicesPage() {
  // Fetch data on the server
  // MODIFIED: Destructure the { data, error } object from the server action
  const { data: initialData, error } = await getCases()

  // Log an error if fetching failed
  if (error) {
    console.error('Error fetching inmigration cases:', error)
  }

  // Safe fallback
  // MODIFIED: Check the 'initialData' variable, which is the 'data' property
  const safeInmigrationCases: InmigrationCaseUI[] = Array.isArray(initialData) // CORRECTED
    ? initialData
    : []

  return <InmigrationClient initialCases={safeInmigrationCases} /> // CORRECTED
}