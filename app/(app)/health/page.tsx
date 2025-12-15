// app/(app)/health/page.tsx
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import HealthClient from './HealthClient';
import {
  addSupplementAction,
  updateSupplementAction,
  refillSupplementAction,
  bulkRefillAction,
  deleteSupplementAction,
  saveVitalsReading,
  deleteVitalsReading,
  type SuppItem,
  type InventoryEvent,
  type VitalsRow
} from './actions';

export const metadata = {
  title: 'Health | Business Software',
  description: 'Manage supplements inventory and track vital health metrics.',
};

export default async function HealthPage() {
  const supabase = await createSupabaseServerClient();

  // Fetch all necessary data in parallel
  const [supplementsRes, eventsRes, vitalsRes] = await Promise.all([
    // 1. Supplements Inventory
    supabase
      .from('supplements')
      .select('*')
      .order('start_date', { ascending: false }),

    // 2. Inventory History (Limit to recent 50 for performance)
    supabase
      .from('inventory_events')
      .select('*')
      .order('id', { ascending: false })
      .limit(50),

    // 3. Vitals Readings (Limit to recent 20 for dashboard view)
    supabase
      .from('vitals_readings')
      .select('*')
      .order('reading_date', { ascending: false })
      .limit(20),
  ]);

  // Log errors if any (non-blocking)
  if (supplementsRes.error) {
    console.error('Error fetching supplements:', supplementsRes.error);
  }
  if (eventsRes.error) {
    console.error('Error fetching inventory events:', eventsRes.error);
  }
  if (vitalsRes.error) {
    console.error('Error fetching vitals:', vitalsRes.error);
  }

  return (
    <HealthClient
      initialItems={(supplementsRes.data ?? []) as SuppItem[]}
      initialEvents={(eventsRes.data ?? []) as InventoryEvent[]}
      initialVitals={(vitalsRes.data ?? []) as VitalsRow[]}
      addSupplementAction={addSupplementAction}
      updateSupplementAction={updateSupplementAction}
      refillSupplementAction={refillSupplementAction}
      bulkRefillAction={bulkRefillAction}
      deleteSupplementAction={deleteSupplementAction}
      saveVitalsAction={saveVitalsReading}
      deleteVitalsAction={deleteVitalsReading}
    />
  );
}