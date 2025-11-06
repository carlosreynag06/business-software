// app/(app)/actions.ts
'use server';

import {
  BusinessKpis,
  PipelineStage,
  RevenueData,
  ChannelData,
  ModuleHealth,
  ActivityItem,
} from '@/lib/types'; // We will create these types in lib/types.ts

/**
 * MOCK: Fetches the main KPI data for the dashboard.
 */
export async function getBusinessKpiData(): Promise<BusinessKpis | null> {
  // Mock data based on design spec
  return {
    revenue: 245300.0,
    leads: 38,
    closes: 12,
    attendance: 92, // as a percentage
  };
}

/**
 * MOCK: Fetches data for the pipeline funnel.
 */
export async function getPipelineFunnelData(): Promise<PipelineStage[] | null> {
  // Mock data based on design spec
  return [
    { name: 'Lead', count: 120, conversionRate: 31.6 },
    { name: 'Discovery', count: 38, conversionRate: 68.4 },
    { name: 'Delivery', count: 26, conversionRate: 46.1 },
    { name: 'Paid', count: 12, conversionRate: 0 },
  ];
}

/**
 * MOCK: Fetches revenue broken down by service.
 */
export async function getRevenueByServiceData(): Promise<RevenueData[] | null> {
  // Mock data based on design spec and functional spec
  return [
    { name: 'Websites', revenue: 95000.0 },
    { name: 'Software', revenue: 72000.0 },
    { name: 'English Classes', revenue: 35000.0 },
    { name: 'Spanish Classes', revenue: 15000.0 },
    { name: 'Visa Help', revenue: 20300.0 },
    { name: 'Social Media', revenue: 8000.0 },
  ];
}

/**
 * MOCK: Fetches data for the channel performance table.
 */
export async function getChannelPerformanceData(): Promise<ChannelData[] | null> {
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
  ];
}

/**
 * MOCK: Fetches health stats for Projects, Classes, and Visa modules.
 */
export async function getModuleHealthData(): Promise<ModuleHealth | null> {
  // Mock data based on design spec
  return {
    projects: { onTime: 5, blocked: 1 },
    classes: { active: 22, renewals: 3 },
    visa: { active: 8, atRisk: 2 },
  };
}

/**
 * MOCK: Fetches upcoming activities for a dashboard feed.
 */
export async function getUpcomingActivities(): Promise<ActivityItem[] | null> {
  const now = new Date();
  const addHours = (date: Date, hours: number) =>
    new Date(date.getTime() + hours * 60 * 60 * 1000);

  // Mock data
  return [
    {
      id: '1',
      type: 'meeting',
      summary: 'Discovery Call - "Ana Gómez" (New Website)',
      timestamp: addHours(now, 2).toISOString(),
    },
    {
      id: '2',
      type: 'call',
      summary: 'Follow-up with "Juan Perez" (Visa Case)',
      timestamp: addHours(now, 4).toISOString(),
    },
    {
      id: '3',
      type: 'note',
      summary: 'Prepare syllabus for "Michael Smith" (English)',
      timestamp: addHours(now, 24).toISOString(),
    },
    {
      id: '4',
      type: 'meeting',
      summary: 'Project Demo - "TechCorp" (Software)',
      timestamp: addHours(now, 48).toISOString(),
    },
  ];
}