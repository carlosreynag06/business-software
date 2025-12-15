import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fromZonedTime } from 'date-fns-tz';

const NY_TZ = 'America/New_York';

function toUtcISOFromNY(localISO: string | null | undefined) {
  if (!localISO) return null;
  // Accepts "YYYY-MM-DDTHH:mm" in NY-local, returns UTC ISO string.
  return fromZonedTime(localISO, NY_TZ).toISOString();
}

// GET /api/agenda/events?startLocalISO=YYYY-MM-DDTHH:mm&endLocalISO=YYYY-MM-DDTHH:mm
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startLocalISO = searchParams.get('startLocalISO');
    const endLocalISO = searchParams.get('endLocalISO');

    if (!startLocalISO || !endLocalISO) {
      return NextResponse.json(
        { error: 'Missing startLocalISO or endLocalISO' },
        { status: 400 }
      );
    }

    const startUtc = toUtcISOFromNY(startLocalISO)!;
    const endUtc = toUtcISOFromNY(endLocalISO)!;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Overlap: (start_ts <= endUtc) AND (end_ts IS NULL OR end_ts >= startUtc)
    const { data, error } = await supabase
      .from('calendar_events')
      // --- SELECT includes category, location, and notes ---
      .select('id, title, start_ts, end_ts, kind, category, status, world, all_day, location, notes')
      .eq('user_id', user.id)
      .lte('start_ts', endUtc)
      .or(`end_ts.gte.${startUtc},end_ts.is.null`)
      .order('start_ts', { ascending: true });

    if (error) {
       console.error("Supabase GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("GET handler error:", err);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}

// POST /api/agenda/events
// Accepts payload including optional location and notes
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = (await req.json()) as Record<string, any> | null;
    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const hasApiTimes = typeof raw.start_time === 'string' || raw.end_time != null;
    const hasLegacyTimes = typeof raw.start_local === 'string' || raw.end_local != null;

    if (!hasApiTimes && !hasLegacyTimes) {
      return NextResponse.json({ error: 'Missing required time fields' }, { status: 400 });
    }

    // Common fields
    const title: string | undefined = typeof raw.title === 'string' ? raw.title.trim() : undefined;
    // --- Category is read from the payload ---
    const category: string | undefined = typeof raw.category === 'string' ? raw.category : undefined;
    const location: string | null = typeof raw.location === 'string' ? raw.location.trim() : null;
    const notes: string | null = typeof raw.notes === 'string' ? raw.notes.trim() : null;
    let world: 'Business' | 'Personal';

    // Normalize to DB fields
    let start_ts: string | null = null;
    let end_ts: string | null = null;
    let all_day: boolean;
    const status: string = typeof raw.status === 'string' ? raw.status : 'scheduled';
    const kind: string = typeof raw.kind === 'string' ? raw.kind : 'event';

    if (hasApiTimes) {
      // API shape handling
      const st = raw.start_time;
      const et = raw.end_time ?? null;
      start_ts = st ? new Date(st).toISOString() : null;
      end_ts = et ? new Date(et).toISOString() : null;
      if (raw.world !== 'Business' && raw.world !== 'Personal') {
        return NextResponse.json({ error: 'Missing or invalid required field: world' }, { status: 400 });
      }
      if (typeof raw.all_day !== 'boolean') {
         return NextResponse.json({ error: 'Missing or invalid required field: all_day' }, { status: 400 });
      }
      world = raw.world;
      all_day = raw.all_day;
    } else {
      // Legacy UI shape handling
      start_ts = toUtcISOFromNY(raw.start_local);
      end_ts = toUtcISOFromNY(raw.end_local ?? undefined);
      world = (category === 'Work' || category === 'Business') ? 'Business' : 'Personal';
      all_day = typeof raw.all_day === 'boolean' ? raw.all_day : false;
    }

    // Final validation
    if (!title || !category || !start_ts) {
      return NextResponse.json({ error: 'Missing required fields (title, category, start_time/start_local)' }, { status: 400 });
    }

    // --- Validate category against ENUM ---
    const validCategories = ['Work', 'Personal', 'Health', 'Errand', 'Other'];
    if (!validCategories.includes(category)) {
        console.warn(`Received invalid category '${category}'. Check mapping in AddEventDrawer.`);
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert([
        {
          user_id: user.id,
          title,
          start_ts,
          end_ts,
          category, // --- Category is inserted here ---
          world,
          all_day,
          status,
          kind,
          location,
          notes,
        },
      ])
      // --- SELECT includes category, location, and notes after insert ---
      .select('id, title, start_ts, end_ts, category, world, all_day, status, kind, location, notes')
      .single();

    if (error) {
       console.error("Supabase POST error:", error);
      return NextResponse.json(
        { error: error.message, details: (error as any).details ?? null, hint: (error as any).hint ?? null },
        { status: 500 }
      );
    }

    revalidatePath('/agenda');
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error("POST handler error:", err);
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}