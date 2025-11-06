// app/(app)/page.tsx
import * as React from 'react';
import {
  getBusinessKpiData,
  getPipelineFunnelData,
  getRevenueByServiceData,
  getChannelPerformanceData,
  getModuleHealthData,
  getUpcomingActivities,
} from './actions';
import DashboardClient from './DashboardClient';
import type {
  BusinessKpis,
  PipelineStage,
  RevenueData,
  ChannelData,
  ModuleHealth,
  ActivityItem,
} from '@/lib/types'; // We will define these types in lib/types.ts

export default async function DashboardServerPage() {
  // Fetch all dashboard data in parallel
  // We assume these functions will be in './actions.ts' and return mock data
  const [
    kpiData,
    pipelineData,
    revenueData,
    channelData,
    healthData,
    activityData,
  ] = await Promise.all([
    getBusinessKpiData(),
    getPipelineFunnelData(),
    getRevenueByServiceData(),
    getChannelPerformanceData(),
    getModuleHealthData(),
    getUpcomingActivities(), // For an "upcoming activities" feed
  ]);

  // Safe fallbacks ensure the client component always receives valid props
  const safeKpiData: BusinessKpis = kpiData ?? {
    revenue: 0,
    leads: 0,
    closes: 0,
    attendance: 0,
  };

  const safePipelineData: PipelineStage[] = Array.isArray(pipelineData)
    ? pipelineData
    : [];

  const safeRevenueData: RevenueData[] = Array.isArray(revenueData)
    ? revenueData
    : [];

  const safeChannelData: ChannelData[] = Array.isArray(channelData)
    ? channelData
    : [];

  const safeHealthData: ModuleHealth = healthData ?? {
    projects: { onTime: 0, blocked: 0 },
    classes: { active: 0, renewals: 0 },
    visa: { active: 0, atRisk: 0 },
  };

  const safeActivityData: ActivityItem[] = Array.isArray(activityData)
    ? activityData
    : [];

  // Pass all fetched data to the client component
  return (
    <DashboardClient
      initialKpis={safeKpiData}
      initialPipeline={safePipelineData}
      initialRevenue={safeRevenueData}
      initialChannels={safeChannelData}
      initialHealth={safeHealthData}
      initialActivities={safeActivityData}
    />
  );
}