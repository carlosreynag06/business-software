// app/(app)/health/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/* =========================================================
   TYPES
   ========================================================= */

// --- Supplements / Inventory Types ---
export interface SuppItem {
  id: string;
  name: string;
  brand?: string;
  form: 'capsule' | 'tablet' | 'powder' | 'liquid';
  dosage_per_unit: string;
  units_per_dose: number;
  times_per_day: number;
  time_slots: string[]; // stored as text[] in db
  quantity_on_hand: number;
  refill_size?: number;
  refill_threshold_days: number;
  cost_per_unit?: number;
  notes?: string;
  start_date: string; // YYYY-MM-DD
}

export interface InventoryEvent {
  id: string;
  type: 'added' | 'edited' | 'autodecrement' | 'refilled' | 'deleted';
  at: string;
  note?: string;
}

// --- Vitals Types ---
export type VitalType = 'BP' | 'HR';

export interface VitalsRow {
  id: string;
  user_id: string;
  reading_date: string; // YYYY-MM-DD
  vital_type: VitalType;
  systolic: number | null;
  diastolic: number | null;
  hr: number | null;
  notes: string | null;
}

/* =========================================================
   SUPPLEMENTS / INVENTORY ACTIONS
   ========================================================= */

// Create Supplement
export async function addSupplementAction(item: SuppItem) {
  const supabase = await createSupabaseServerClient();

  const { error: insertErr } = await supabase
    .from('supplements')
    .insert([
      {
        id: item.id,
        name: item.name,
        brand: item.brand ?? null,
        form: item.form,
        dosage_per_unit: item.dosage_per_unit,
        units_per_dose: item.units_per_dose,
        times_per_day: item.times_per_day,
        time_slots: item.time_slots,
        quantity_on_hand: item.quantity_on_hand,
        refill_size: item.refill_size ?? null,
        refill_threshold_days: item.refill_threshold_days,
        cost_per_unit:
          typeof item.cost_per_unit === 'number' ? item.cost_per_unit : null,
        notes: item.notes ?? null,
        start_date: item.start_date,
      },
    ]);

  if (insertErr) {
    console.error('addSupplementAction insertErr', insertErr);
    throw insertErr;
  }

  // Log event
  const { error: evtErr } = await supabase.from('inventory_events').insert([
    {
      type: 'added',
      at: 'Now',
      note: item.name,
    },
  ]);

  if (evtErr) {
    console.error('addSupplementAction evtErr', evtErr);
  }

  revalidatePath('/health');
}

// Update Supplement
export async function updateSupplementAction(item: SuppItem) {
  const supabase = await createSupabaseServerClient();

  const { error: updateErr } = await supabase
    .from('supplements')
    .update({
      name: item.name,
      brand: item.brand ?? null,
      form: item.form,
      dosage_per_unit: item.dosage_per_unit,
      units_per_dose: item.units_per_dose,
      times_per_day: item.times_per_day,
      time_slots: item.time_slots,
      quantity_on_hand: item.quantity_on_hand,
      refill_size: item.refill_size ?? null,
      refill_threshold_days: item.refill_threshold_days,
      cost_per_unit:
        typeof item.cost_per_unit === 'number' ? item.cost_per_unit : null,
      notes: item.notes ?? null,
      start_date: item.start_date,
    })
    .eq('id', item.id);

  if (updateErr) {
    console.error('updateSupplementAction updateErr', updateErr);
    throw updateErr;
  }

  const { error: evtErr } = await supabase.from('inventory_events').insert([
    {
      type: 'edited',
      at: 'Now',
      note: item.name,
    },
  ]);

  if (evtErr) {
    console.error('updateSupplementAction evtErr', evtErr);
  }

  revalidatePath('/health');
}

// Refill Single Item
export async function refillSupplementAction(args: {
  id: string;
  qty: number;
  vendor?: string;
  cost?: number;
  name: string;
}) {
  const { id, qty, vendor, name } = args;
  const supabase = await createSupabaseServerClient();

  // Try RPC first
  const { error: refillErr } = await supabase.rpc('increment_quantity_on_hand', {
    p_supplement_id: id,
    p_qty: qty,
  });

  // Fallback if RPC missing
  if (refillErr) {
    const { data: row, error: fetchErr } = await supabase
      .from('supplements')
      .select('quantity_on_hand')
      .eq('id', id)
      .single();

    if (fetchErr) {
      console.error('refillSupplementAction fetchErr', fetchErr);
      throw fetchErr;
    }

    const newQty = (row?.quantity_on_hand || 0) + qty;

    const { error: updErr } = await supabase
      .from('supplements')
      .update({ quantity_on_hand: newQty })
      .eq('id', id);

    if (updErr) {
      console.error('refillSupplementAction updErr', updErr);
      throw updErr;
    }
  }

  // Log event
  const notePieces: string[] = [`${name} +${qty}`];
  if (vendor) notePieces.push(`(${vendor})`);
  const noteFinal = notePieces.join(' ');

  const { error: evtErr } = await supabase.from('inventory_events').insert([
    {
      type: 'refilled',
      at: 'Now',
      note: noteFinal,
    },
  ]);

  if (evtErr) {
    console.error('refillSupplementAction evtErr', evtErr);
  }

  revalidatePath('/health');
}

// Bulk Refill
export async function bulkRefillAction(refills: { id: string; qty: number }[]) {
  const supabase = await createSupabaseServerClient();

  for (const { id, qty } of refills) {
    const { data: row, error: fetchErr } = await supabase
      .from('supplements')
      .select('quantity_on_hand, name')
      .eq('id', id)
      .single();

    if (fetchErr) {
      console.error('bulkRefillAction fetchErr', fetchErr);
      continue;
    }

    const newQty = (row?.quantity_on_hand || 0) + qty;

    const { error: updErr } = await supabase
      .from('supplements')
      .update({ quantity_on_hand: newQty })
      .eq('id', id);

    if (updErr) {
      console.error('bulkRefillAction updErr', updErr);
      continue;
    }

    const eventNote = `${row?.name ?? 'Item'} +${qty}`;
    await supabase.from('inventory_events').insert([
      {
        type: 'refilled',
        at: 'Now',
        note: eventNote,
      },
    ]);
  }

  // Summary event
  await supabase.from('inventory_events').insert([
    {
      type: 'refilled',
      at: 'Now',
      note: `Bulk refilled ${refills.length} ${refills.length === 1 ? 'item' : 'items'}`,
    },
  ]);

  revalidatePath('/health');
}

// Delete Supplement
export async function deleteSupplementAction(id: string) {
  const supabase = await createSupabaseServerClient();

  // Get name for logging before delete
  const { data: row } = await supabase
    .from('supplements')
    .select('name')
    .eq('id', id)
    .single();

  const nameForNote = row?.name ?? 'Item';

  const { error: delErr } = await supabase
    .from('supplements')
    .delete()
    .eq('id', id);

  if (delErr) {
    console.error('deleteSupplementAction delErr', delErr);
    throw delErr;
  }

  await supabase.from('inventory_events').insert([
    {
      type: 'deleted',
      at: 'Now',
      note: nameForNote,
    },
  ]);

  revalidatePath('/health');
}

/* =========================================================
   VITALS ACTIONS
   ========================================================= */

export async function getVitalsReadings(): Promise<
  | { success: true; rows: VitalsRow[] }
  | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes?.user) {
    return { success: false, error: 'You are not signed in.' };
  }

  const { data, error } = await supabase
    .from('vitals_readings')
    .select('id, user_id, reading_date, vital_type, systolic, diastolic, hr, notes')
    .order('reading_date', { ascending: false });

  if (error) return { success: false, error: error.message };

  return { success: true, rows: (data ?? []) as VitalsRow[] };
}

export async function saveVitalsReading(payload: {
  id?: string;
  date: string;
  type: VitalType;
  valueSystolic?: number;
  valueDiastolic?: number;
  valueHR?: number;
  notes?: string;
}): Promise<{ success: true; id?: string } | { success: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes?.user) {
    return { success: false, error: 'You are not signed in.' };
  }

  const uid = userRes.user.id;

  // Build DB shape
  const base = {
    reading_date: payload.date,
    vital_type: payload.type as VitalsRow['vital_type'],
    notes: payload.notes?.trim() || null,
    systolic: payload.type === 'BP' ? payload.valueSystolic ?? null : null,
    diastolic: payload.type === 'BP' ? payload.valueDiastolic ?? null : null,
    hr: payload.type === 'HR' ? payload.valueHR ?? null : null,
  };

  if (payload.id) {
    // Update
    const { error } = await supabase
      .from('vitals_readings')
      .update(base)
      .eq('id', payload.id);

    if (error) return { success: false, error: error.message };
    revalidatePath('/health');
    return { success: true, id: payload.id };
  } else {
    // Insert
    const { data, error } = await supabase
      .from('vitals_readings')
      .insert({ user_id: uid, ...base })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath('/health');
    return { success: true, id: data?.id };
  }
}

export async function deleteVitalsReading(id: string): Promise<
  { success: true } | { success: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();

  if (userErr || !userRes?.user) {
    return { success: false, error: 'You are not signed in.' };
  }

  const { error } = await supabase.from('vitals_readings').delete().eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/health');
  return { success: true };
}