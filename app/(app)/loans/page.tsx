import React from 'react'
import LoansClient from './LoansClient'
import { getLoans } from './actions'
import type { Loan } from '@/lib/loans.types'

export const metadata = {
  title: 'Loans | Business Software',
  description: 'Manage active loans, track payments, and monitor interest',
}

export default async function LoansPage() {
  const initialLoans = await getLoans()

  return <LoansClient initialLoans={initialLoans} />
}