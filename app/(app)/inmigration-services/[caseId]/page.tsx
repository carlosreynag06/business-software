// app/(app)/inmigration-services/[caseId]/page.tsx
import * as React from 'react'
import { getCaseById, getPayments } from '../actions'
import CaseDetailClient from './CaseDetailClient'
import type { PaymentUI } from '@/lib/inmigration.types'
import { notFound } from 'next/navigation'

interface CaseDetailPageProps {
  params: Promise<{
    caseId: string
  }>
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { caseId } = await params

  const [caseResult, paymentsResult] = await Promise.all([
    getCaseById(caseId),
    getPayments(),
  ])

  if (caseResult.error || !caseResult.data) {
    if (caseResult.error) {
      console.error('Error fetching case:', caseResult.error)
    }
    notFound()
  }

  if (paymentsResult.error) {
    console.error('Error fetching payments:', paymentsResult.error)
  }
  const safePayments: PaymentUI[] = Array.isArray(paymentsResult.data)
    ? paymentsResult.data
    : []

  return (
    <CaseDetailClient
      initialCase={caseResult.data}
      allPayments={safePayments}
    />
  )
}
