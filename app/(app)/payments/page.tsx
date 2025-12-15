// app/(app)/payments/page.tsx
import * as React from 'react'
import { getPaymentData } from './actions'
import PaymentClient from './PaymentClient'
// MODIFIED: Import ClassStudent, remove ClassPackage, ADD Project
import type { Payment, Lead, ClassStudent, Project } from '@/lib/types'

// ADDED: Import inmigration actions and types
import {
  getPayments as getInmigrationPayments,
  getCases as getInmigrationCases,
} from '../inmigration-services/actions'
import type {
  PaymentUI as InmigrationPaymentUI,
  InmigrationCaseUI,
} from '@/lib/inmigration.types'

export default async function PaymentsServerPage() {
  // Fetch data on the server
  // MODIFIED: Fetch all data sources in parallel
  const [initialData, inmigrationPaymentsRes, inmigrationCasesRes] =
    await Promise.all([
      getPaymentData(),
      getInmigrationPayments(),
      getInmigrationCases(),
    ])

  // Safe fallbacks
  const safePayments: Payment[] = Array.isArray(initialData?.payments)
    ? initialData.payments
    : []

  const safeLeads: Lead[] = Array.isArray(initialData?.leads)
    ? initialData.leads
    : []

  // MODIFIED: Get students, not packages
  const safeStudents: ClassStudent[] = Array.isArray(initialData?.students)
    ? initialData.students
    : []

  // ADDED: Get projects
  // Ensure each project has at least { id, name, clientName } (no label logic here).
  // Preserve any additional fields the client component may already rely on.
  const safeProjects: Project[] = Array.isArray(initialData?.projects)
    ? (initialData.projects as any[]).map((p) => ({
        ...p,
        clientName: p.clientName ?? p.client_name ?? 'N/A',
      }))
    : []

  // ADDED: Safe fallbacks for inmigration data
  const safeInmigrationPayments: InmigrationPaymentUI[] = Array.isArray(
    inmigrationPaymentsRes.data,
  )
    ? inmigrationPaymentsRes.data
    : []

  const safeInmigrationCases: InmigrationCaseUI[] = Array.isArray(
    inmigrationCasesRes.data,
  )
    ? inmigrationCasesRes.data
    : []

  return (
    <PaymentClient
      initialPayments={safePayments}
      initialLeads={safeLeads}
      initialStudents={safeStudents} // MODIFIED: Pass students
      initialProjects={safeProjects} // ADDED: Pass projects (guaranteed clientName)
      // ADDED: Pass inmigration data to the client
      initialInmigrationPayments={safeInmigrationPayments}
      initialInmigrationCases={safeInmigrationCases}
    />
  )
}