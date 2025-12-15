'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CalendarEventLite } from '@/lib/types';
// timezone helper (New York local → UTC ISO)
import { fromZonedTime } from 'date-fns-tz';
// --- NEW: Import revalidatePath ---
import { revalidatePath } from 'next/cache';
// --- END NEW ---


const NY_TZ = 'America/New_York';

/**
 * Add N days to a local date string "YYYY-MM-DD" and return the same format.
 * Minimal helper to avoid importing extra libs.
 */
function addDaysISO(dateISO: string, days: number): string {
  // Construct a date at local midnight (no TZ assumptions in string)
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  // Reformat back to "YYYY-MM-DD"
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * In a Server Actions file, exported functions must be async.
 * Converts a New York–local ISO string to a UTC ISO string.
 */
export async function toUtcISOFromNY(localISO: string | null | undefined) {
  if (!localISO) return null;
  // localISO: "YYYY-MM-DDTHH:mm" or full local ISO in NY timezone
  return fromZonedTime(localISO, NY_TZ).toISOString();
}

/**
 * Convert a local NY date string "YYYY-MM-DD" to the UTC ISO range
 * covering that entire local day: [00:00, next 00:00).
 * Pass local-clock strings directly to zonedTimeToUtc to avoid host TZ issues.
 */
function nyDayUtcBounds(dateISO: string): { startISO: string; endISO: string } {
  const nextDateISO = addDaysISO(dateISO, 1);

  const startUTC = fromZonedTime(`${dateISO}T00:00:00`, NY_TZ).toISOString();
  const endUTC = fromZonedTime(`${nextDateISO}T00:00:00`, NY_TZ).toISOString();

  return { startISO: startUTC, endISO: endUTC };
}

/**
 * Convert a local NY range [startLocalISO, endLocalISO) to UTC ISO strings.
 * Inputs are full local NY ISO strings, e.g., "2025-10-20T00:00:00".
 */
function nyRangeToUtc(
  startLocalISO: string,
  endLocalISO: string
): { startUTC: string; endUTC: string } {
  const startUTC = fromZonedTime(startLocalISO, NY_TZ).toISOString();
  const endUTC = fromZonedTime(endLocalISO, NY_TZ).toISOString();
  return { startUTC, endUTC };
}

// --- NEW: Helper to get User ID ---
async function getUserId(): Promise<string | null> {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        console.error('Authentication error in calendar actions:', error?.message);
        return null;
    }
    return user.id;
}
// --- END NEW ---

/**
 * Return all pending tasks due on the given local NY day.
 * Filters:
 * - kind = 'task'
 * - status = 'pending'
 * - start_ts within [dayStart, dayEnd) in UTC, computed from NY local day.
 */
export async function listTasksDueOn(dateISO: string): Promise<CalendarEventLite[]> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];

  const { startISO, endISO } = nyDayUtcBounds(dateISO);

  const { data, error } = await supabase
    .from('calendar_events')
    .select('id,title,start_ts,end_ts,kind,category,status')
    .eq('kind', 'task')
    .eq('status', 'pending')
    .gte('start_ts', startISO)
    .lt('start_ts', endISO)
    .order('start_ts', { ascending: true });

  if (error || !data) {
    console.error(`Error fetching tasks due on ${dateISO}:`, error?.message);
    return [];
   }


  return data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    start_ts: row.start_ts as string,
    end_ts: (row.end_ts as string | null) ?? null,
    kind: row.kind as CalendarEventLite['kind'],
    category: row.category as CalendarEventLite['category'],
    // status: row.status as string // Include if needed by caller
  }));
}

/**
 * Return events/tasks overlapping the given local NY window [startLocalISO, endLocalISO).
 * Overlap condition:
 * start_ts < endUTC AND (end_ts IS NULL OR end_ts > startUTC)
 *
 * Implemented as an OR of two AND branches (PostgREST constraint):
 * A) end_ts IS NULL AND start_ts < endUTC
 * B) end_ts > startUTC AND start_ts < endUTC
 */
export async function listEventsInRange(
  startLocalISO: string,
  endLocalISO: string
): Promise<CalendarEventLite[]> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return [];

  const { startUTC, endUTC } = nyRangeToUtc(startLocalISO, endLocalISO);

  // PostgREST OR filter encoding for overlap logic
  const overlapOr =
    `and(end_ts.is.null,start_ts.lt.${endUTC}),` + // A: open-ended items before end
    `and(end_ts.gt.${startUTC},start_ts.lt.${endUTC})`; // B: bounded items overlapping

  const { data, error } = await supabase
    .from('calendar_events')
    // --- UPDATED SELECT to include location and notes ---
    .select('id,title,start_ts,end_ts,kind,category,status,location,notes,all_day,world') // Added fields
    // --- END UPDATE ---
    .eq('user_id', auth.user.id) // Ensure RLS-like filtering even if RLS is off
    .or(overlapOr)
    .order('start_ts', { ascending: true });

  if (error || !data) {
    console.error(`Error fetching events in range ${startLocalISO} - ${endLocalISO}:`, error?.message);
    return [];
  }


  return data.map((row: any) => ({ // Use any temporarily if CalendarEventLite doesn't match select
    id: row.id as string,
    title: row.title as string,
    start_ts: row.start_ts as string,
    end_ts: (row.end_ts as string | null) ?? null,
    kind: row.kind as CalendarEventLite['kind'],
    category: row.category as CalendarEventLite['category'],
    // --- NEW: Add fields to returned object ---
    location: row.location as string | null,
    notes: row.notes as string | null,
    all_day: row.all_day as boolean,
    world: row.world as 'Business' | 'Personal',
    status: row.status as string, // Include status if needed
    // --- END NEW ---
  }));
}

/**
 * Return ALL calendar items (tasks and events, regardless of status)
 * starting on the given local NY day.
 * Filters:
 * - start_ts within [dayStart, dayEnd) in UTC, computed from NY local day.
 */
export async function listAgendaItemsForDay(dateISO: string): Promise<CalendarEventLite[]> {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return []; // Return empty if not authenticated

  // Get the UTC time range covering the entire local day
  const { startISO, endISO } = nyDayUtcBounds(dateISO);

  // Fetch all calendar_events that start within that UTC range
  const { data, error } = await supabase
    .from('calendar_events')
    // --- UPDATED SELECT to include location and notes ---
    .select('id, title, start_ts, end_ts, kind, category, status, location, notes, all_day, world') // Added fields
    // --- END UPDATE ---
    .eq('user_id', auth.user.id) // Ensure user owns the items (RLS also enforces)
    .gte('start_ts', startISO)   // Event starts on or after the day's UTC start
    .lt('start_ts', endISO)     // Event starts before the next day's UTC start
    .order('start_ts', { ascending: true }); // Order chronologically

  if (error) {
    console.error(`Error fetching agenda items for ${dateISO}:`, error.message);
    return []; // Return empty on error
  }
  if (!data) {
     return []; // Return empty if no data
  }

  // Map the raw data to the CalendarEventLite type (adapt if needed based on full type)
  return data.map((row : any) => ({
    id: row.id as string,
    title: row.title as string,
    start_ts: row.start_ts as string,
    end_ts: (row.end_ts as string | null) ?? null,
    kind: row.kind as CalendarEventLite['kind'],
    category: row.category as CalendarEventLite['category'],
    // Include other fields if your CalendarEventLite type expects them
    // location: row.location as string | null,
    // notes: row.notes as string | null,
    // status: row.status as string
  }));
}


// --- NEW: Delete Calendar Event Action ---
/**
 * Deletes a specific calendar event for the authenticated user.
 */
export async function deleteCalendarEvent(payload: { id: string }): Promise<{ success: boolean; error?: string }> {
    const supabase = await createSupabaseServerClient();
    const userId = await getUserId();

    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    if (!payload.id) {
        return { success: false, error: 'Event ID is required.' };
    }

    try {
        const { error } = await supabase
            .from('calendar_events')
            .delete()
            .eq('id', payload.id)
            .eq('user_id', userId); // RLS also enforces this, but explicit check is good practice

        if (error) {
            console.error('Error deleting calendar event:', error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/calendar'); // Revalidate the calendar page
        revalidatePath('/'); // Revalidate dashboard if it uses calendar data

        return { success: true };

    } catch (e: any) {
        console.error('Unexpected error deleting event:', e.message);
        return { success: false, error: e.message || 'An unexpected error occurred.' };
    }
}
// --- END NEW ---


// --- NEW: Update Calendar Event Action ---
/**
 * Updates a specific calendar event for the authenticated user.
 * Expects UTC ISO strings for start_ts and end_ts.
 */
export async function updateCalendarEvent(payload: {
    id: string;
    title?: string;
    start_ts?: string | null; // UTC ISO
    end_ts?: string | null;   // UTC ISO
    category?: string;
    all_day?: boolean;
    location?: string | null;
    notes?: string | null;
    // Include other fields like kind, status, world if they can be updated
    kind?: string;
    status?: string;
    world?: 'Business' | 'Personal';
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createSupabaseServerClient();
    const userId = await getUserId();

    if (!userId) {
        return { success: false, error: 'User not authenticated.' };
    }
    if (!payload.id) {
        return { success: false, error: 'Event ID is required for update.' };
    }

    // Construct the object with only the fields to update
    const updateData: { [key: string]: any } = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.start_ts !== undefined) updateData.start_ts = payload.start_ts;
    if (payload.end_ts !== undefined) updateData.end_ts = payload.end_ts;
    if (payload.category !== undefined) updateData.category = payload.category;
    if (payload.all_day !== undefined) updateData.all_day = payload.all_day;
    if (payload.location !== undefined) updateData.location = payload.location;
    if (payload.notes !== undefined) updateData.notes = payload.notes;
    if (payload.kind !== undefined) updateData.kind = payload.kind;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.world !== undefined) updateData.world = payload.world;

    // Basic validation: ensure title isn't set to empty if provided
    if (updateData.title !== undefined && !updateData.title.trim()) {
        return { success: false, error: 'Event title cannot be empty.' };
    }
    // Ensure start_ts is present (as it's often required)
     if (!updateData.start_ts) {
       // Fetch existing event to ensure start_ts isn't accidentally removed if not provided
       const { data: existingEvent, error: fetchError } = await supabase
         .from('calendar_events')
         .select('start_ts')
         .eq('id', payload.id)
         .eq('user_id', userId)
         .single();

       if (fetchError || !existingEvent?.start_ts) {
          return { success: false, error: 'Start time is required and could not be verified.' };
       }
       // If start_ts wasn't in the payload, use the existing one
       if (payload.start_ts === undefined) {
           updateData.start_ts = existingEvent.start_ts;
       } else if (!payload.start_ts) {
            // If explicitly set to null/empty in payload, reject (or handle based on requirements)
           return { success: false, error: 'Start time cannot be empty.' };
       }
     }


    if (Object.keys(updateData).length === 0) {
        return { success: true }; // Nothing to update
    }

    // Add updated_at manually if trigger isn't set up
    // updateData.updated_at = new Date().toISOString();

    try {
        const { error } = await supabase
            .from('calendar_events')
            .update(updateData)
            .eq('id', payload.id)
            .eq('user_id', userId); // Ensure user owns the event

        if (error) {
            console.error('Error updating calendar event:', error.message);
            return { success: false, error: error.message };
        }

        revalidatePath('/calendar'); // Revalidate the calendar page
        revalidatePath('/'); // Revalidate dashboard if it uses calendar data

        return { success: true };

    } catch (e: any) {
        console.error('Unexpected error updating event:', e.message);
        return { success: false, error: e.message || 'An unexpected error occurred.' };
    }
}
// --- END NEW ---