// app/(app)/real-estate/page.tsx

import React from 'react'
import RealEstateClient from './RealEstateClient'
import { getRealEstateDeals } from './actions'

export const metadata = {
  title: 'Real Estate | Business Software',
}

export default async function RealEstatePage() {
  const initialDeals = await getRealEstateDeals()

  return <RealEstateClient initialDeals={initialDeals} />
}
