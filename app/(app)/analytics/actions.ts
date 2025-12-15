// app/(app)/analytics/actions.ts
'use server'

import type {
  RevenueData,
  ChannelData,
  PipelineStage,
  ServiceType,
  MarketingChannel,
} from '@/lib/types'

/*
|--------------------------------------------------------------------------
| Mock Data Functions
|--------------------------------------------------------------------------
| These functions provide mock data for the analytics page.
*/

/**
 * MOCK: Fetches revenue broken down by service.
 */
async function getRevenueByServiceData(): Promise<RevenueData[]> {
  // Mock data based on design spec and functional spec
  return [
    { name: 'website', revenue: 95000.0 },
    { name: 'software', revenue: 72000.0 },
    { name: 'english_class', revenue: 35000.0 },
    { name: 'spanish_class', revenue: 15000.0 },
    { name: 'visa', revenue: 20300.0 },
    { name: 'social_media', revenue: 8000.0 },
  ]
}

/**
 * MOCK: Fetches data for the pipeline funnel.
 */
async function getPipelineFunnelData(): Promise<PipelineStage[]> {
  // Mock data based on design spec
  return [
    { name: 'Lead', count: 120, conversionRate: 31.6 },
    { name: 'Discovery', count: 38, conversionRate: 68.4 },
    { name: 'Delivery', count: 26, conversionRate: 46.1 },
    { name: 'Paid', count: 12, conversionRate: 0 },
  ]
}

/**
 * MOCK: Fetches data for the channel performance table.
 */
async function getChannelPerformanceData(): Promise<ChannelData[]> {
  // Mock data based on design spec
  return [
    {
      name: 'Instagram',
      spend: 500.0,
      leads: 15,
      closes: 4,
      revenue: 60000.0,
    },
    {
      name: 'Google Ads',
      spend: 800.0,
      leads: 10,
      closes: 3,
      revenue: 75000.0,
    },
    {
      name: 'Referral',
      spend: 0.0,
      leads: 8,
      closes: 3,
      revenue: 45000.0,
    },
    {
      name: 'Organic',
      spend: 0.0,
      leads: 5,
      closes: 2,
      revenue: 65300.0,
    },
  ]
}

/**
 * MOCK: Fetches mock revenue data over time for the line chart.
 */
export async function getRevenueOverTime(): Promise<
  { name: string; revenue: number }[]
> {
  return [
    { name: 'Jan', revenue: 25000 },
    { name: 'Feb', revenue: 32000 },
    { name: 'Mar', revenue: 45000 },
    { name: 'Apr', revenue: 42000 },
    { name: 'May', revenue: 51000 },
    { name: 'Jun', revenue: 60000 },
    { name: 'Jul', revenue: 55000 },
  ]
}

/**
 * MOCK: Fetches mock lead distribution for the pie chart.
 */
export async function getLeadsByService(): Promise<
  { name: ServiceType; value: number }[]
> {
  return [
    { name: 'website', value: 45 },
    { name: 'software', value: 12 },
    { name: 'english_class', value: 25 },
    { name: 'spanish_class', value: 10 },
    { name: 'visa', value: 20 },
    { name: 'social_media', value: 8 },
  ]
}

/**
 * MOCK: Main data fetching function for the Analytics page.
 * This bundles all mock data requests into one.
 */
export async function getAnalyticsData(): Promise<{
  revenueData: RevenueData[]
  pipelineData: PipelineStage[]
  channelData: ChannelData[]
  revenueOverTimeData: { name: string; revenue: number }[]
  leadsByServiceData: { name: string; value: number }[]
}> {
  console.log('MOCK: Fetching all analytics data...')
  await new Promise((resolve) => setTimeout(resolve, 300)) // Simulate network delay

  const [
    revenueData,
    pipelineData,
    channelData,
    revenueOverTimeData,
    leadsByServiceData,
  ] = await Promise.all([
    getRevenueByServiceData(),
    getPipelineFunnelData(),
    getChannelPerformanceData(),
    getRevenueOverTime(),
    getLeadsByService(),
  ])

  return {
    revenueData,
    pipelineData,
    channelData,
    revenueOverTimeData,
    leadsByServiceData,
  }
}