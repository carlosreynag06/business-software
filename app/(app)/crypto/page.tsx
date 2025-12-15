// app/(app)/crypto/page.tsx
import * as React from 'react'
import { getCryptoData } from './actions'
import CryptoClient from './CryptoClient'
import type { CryptoTransaction, MonthSummary } from '@/lib/crypto.types'

export default async function CryptoServerPage() {
  // Fetch data on the server
  const initialData = await getCryptoData()

  // Safe fallbacks
  const safeCapital: number = initialData?.initialCapital ?? 0
  const safeHistory: MonthSummary[] = Array.isArray(initialData?.monthHistory)
    ? initialData.monthHistory
    : []
  const safeTransactions: CryptoTransaction[] = Array.isArray(
    initialData?.transactions
  )
    ? initialData.transactions
    : []

  return (
    <CryptoClient
      initialCapital={safeCapital}
      initialMonthHistory={safeHistory}
      initialTransactions={safeTransactions}
    />
  )
}