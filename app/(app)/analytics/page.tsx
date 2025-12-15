// app/(app)/analytics/page.tsx
import * as React from 'react'
import { getAnalyticsData } from './actions'
import AnalyticsClient from './AnalyticsClient'
import type {
  RevenueData,
  ChannelData,
  PipelineStage,
} from '@/lib/types'

export default async function AnalyticsServerPage() {
  // Fetch all analytics data in parallel
  const initialData = await getAnalyticsData()

  // Safe fallbacks
  const safeRevenueData: RevenueData[] = Array.isArray(initialData?.revenueData)
    ? initialData.revenueData
    : []
  
  const safePipelineData: PipelineStage[] = Array.isArray(initialData?.pipelineData)
    ? initialData.pipelineData
    : []
  
  const safeChannelData: ChannelData[] = Array.isArray(initialData?.channelData)
    ? initialData.channelData
    : []
    
  const safeRevenueOverTimeData: { name: string; revenue: number }[] = Array.isArray(initialData?.revenueOverTimeData)
    ? initialData.revenueOverTimeData
    : []
    
  const safeLeadsByServiceData: { name: string; value: number }[] = Array.isArray(initialData?.leadsByServiceData)
    ? initialData.leadsByServiceData
    : []

  return (
    <AnalyticsClient
      initialRevenue={safeRevenueData}
      initialPipeline={safePipelineData}
      initialChannels={safeChannelData}
      initialRevenueOverTime={safeRevenueOverTimeData}
      initialLeadsByService={safeLeadsByServiceData}
    />
  )
}