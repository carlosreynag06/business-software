// app/(app)/page.tsx
import * as React from 'react';
import {
  getRevenueByServiceData,
  getChannelPerformanceData,
  getModuleHealthData,
  getUpcomingActivities,
} from './actions';
import DashboardClient from './DashboardClient';
import type {
  RevenueData,
  ChannelData,
  ModuleHealth,
  ActivityItem,
} from '@/lib/types';

export default async function DashboardServerPage() {
  // Fetch remaining dashboard data in parallel
  const [revenueData, channelData, healthData, activityData] =
    await Promise.all([
      getRevenueByServiceData(),
      getChannelPerformanceData(),
      getModuleHealthData(),
      getUpcomingActivities(),
    ]);

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

  return (
    <DashboardClient
      initialRevenue={safeRevenueData}
      initialChannels={safeChannelData}
      initialHealth={safeHealthData}
      initialActivities={safeActivityData}
    />
  );
}
