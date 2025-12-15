import * as React from 'react';
import { getPersonalDashboardKpiData, getPersonalWeekItems } from './actions';
import { listAgendaItemsForDay } from '@/app/(app)/agenda/actions';
import DashboardClient from './DashboardClient';
import { format } from 'date-fns';

export default async function PersonalDashboardPage() {
  const kpiDataPromise = getPersonalDashboardKpiData();
  const weekItemsPromise = getPersonalWeekItems();
  const todayISO = format(new Date(), 'yyyy-MM-dd');
  
  const todaysAgendaPromise = listAgendaItemsForDay(todayISO).catch((err) => {
    console.error("Error fetching today's agenda items:", err);
    return [];
  });

  const [kpiData, weekItemsData, todaysAgendaData] = await Promise.all([
    kpiDataPromise,
    weekItemsPromise,
    todaysAgendaPromise,
  ]);

  const validKpiData = kpiData || {
    billsDueToday: 0,
    overdueBills: 0,
  };

  const todaysAgendaCount = Array.isArray(todaysAgendaData) ? todaysAgendaData.length : 0;
  const weekItems = Array.isArray(weekItemsData) ? weekItemsData : [];

  return (
    <DashboardClient
      todaysAgendaCount={todaysAgendaCount}
      weekItems={weekItems}
      billsDueToday={validKpiData.billsDueToday}
      overdueBills={validKpiData.overdueBills}
    />
  );
}