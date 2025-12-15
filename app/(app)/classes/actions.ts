// app/(app)/classes/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type {
  ClassStudent,
  ClassPackage,
  ClassSession,
  // CalendarEvent, // No longer returned by this action
  AttendanceStatus,
  ClassStudentStatus,
  ClassLanguage,
  ClassLevel,
  PackageStatus,
  LocationType,
} from '@/lib/types'
// ADDED imports for zod schema
import { LOCATION_TYPES, ATTENDANCE_STATUSES } from '@/lib/types'
import { z } from 'zod'

// Helper type for the full form data
type StudentFormData = {
  id: string | undefined
  // Contact fields
  fullName: string
  email: string
  phone: string
  whatsapp: string
  // Student fields
  language: ClassLanguage
  level: ClassLevel
  status: ClassStudentStatus
  goals: string
}

// Helper type for creating a new package
type CreatePackageInput = {
  studentId: string
  title: string
  sessionsIncluded: number
  priceDopCents: number
  status?: PackageStatus | null
  startDate?: string | null
  endDate?: string | null
}

// Helper type for updating a package
type UpdatePackageInput = {
  title?: string
  sessionsIncluded?: number
  priceDopCents?: number
  status?: PackageStatus | null
  startDate?: string | null
  endDate?: string | null
}

// Helper type for creating a new session
// MODIFIED: Uses zod for validation per Fixes doc
const createSessionSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID'), // Validator
  groupId: z.string().uuid().nullish(),
  packageId: z.string().uuid().nullish(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  timezone: z.string().nullish(),
  locationType: z.enum(LOCATION_TYPES),
  locationDetail: z.string().nullish(),
  attendance: z.enum(ATTENDANCE_STATUSES).nullish(),
  notes: z.string().nullish(),
})
type CreateSessionInput = z.infer<typeof createSessionSchema>

// Helper type for updating a session patch (for drag/drop)
// MODIFIED: Replaces UpdateSessionInput per Fixes doc
type SessionPatch = {
  startTime?: string
  endTime?: string
  attendance?: AttendanceStatus
}

/*
|--------------------------------------------------------------------------
| Server Actions
|--------------------------------------------------------------------------
*/

/**
 * 🧑‍🎓 Fetches all students with their contact info and ACTIVE package.
 * Implements logic from Plan
 */
export async function getStudentsList(): Promise<ClassStudent[]> {
  const supabase = await createSupabaseServerClient()

  // Query students, their required contact, and all their packages
  const { data: studentsData, error } = await supabase
    .from('class_students')
    .select(
      `
      *,
      contact:contacts!inner(*),
      packages:class_packages(*)
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching students list:', error.message)
    return []
  }

  // Map snake_case DB result to camelCase TS type
  const students: ClassStudent[] = studentsData.map((student) => {
    // Find the first active package, as per plan
    const activePackageData = student.packages.find((p) => p.status === 'active')

    const activePackage: ClassPackage | undefined = activePackageData
      ? {
          id: activePackageData.id,
          studentId: activePackageData.student_id,
          title: activePackageData.title,
          sessionsIncluded: activePackageData.sessions_included,
          sessionsConsumed: activePackageData.sessions_consumed,
          priceDopCents: activePackageData.price_dop_cents,
          status: activePackageData.status,
          startDate: activePackageData.start_date,
          endDate: activePackageData.end_date,
        }
      : undefined

    return {
      id: student.id,
      contactId: student.contact_id,
      language: student.language,
      level: student.level,
      status: student.status,
      goals: student.goals,
      contact: {
        id: student.contact.id,
        fullName: student.contact.full_name,
        email: student.contact.email,
        phone: student.contact.phone,
        phoneE164: student.contact.phone_e164,
        whatsapp: student.contact.whatsapp,
        preferredChannel: student.contact.preferred_channel,
        referralSourceText: student.contact.referral_source_text,
        referralContactId: student.contact.referral_contact_id,
        locationCity: student.contact.location_city,
        locationCountry: student.contact.location_country,
        tags: student.contact.tags,
        notes: student.contact.notes,
        createdAt: student.contact.created_at,
      },
      // Attach only the active package as specified
      packages: activePackage ? [activePackage] : [],
    }
  })

  return students
}

/**
 * 📦 Fetches all packages and embeds student/contact info
 * Implements logic from Plan
 */
export async function getAllPackages(): Promise<ClassPackage[]> {
  const supabase = await createSupabaseServerClient()

  const { data: packagesData, error } = await supabase
    .from('class_packages')
    .select(
      `
      *,
      student:class_students!inner (
        *,
        contact:contacts!inner (*)
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all packages:', error.message)
    return []
  }

  // Map snake_case DB result to camelCase TS type
  const packages: ClassPackage[] = packagesData.map((pkg) => ({
    id: pkg.id,
    studentId: pkg.student_id,
    title: pkg.title,
    sessionsIncluded: pkg.sessions_included,
    sessionsConsumed: pkg.sessions_consumed,
    priceDopCents: pkg.price_dop_cents,
    status: pkg.status,
    startDate: pkg.start_date,
    endDate: pkg.end_date,
    student: {
      id: pkg.student.id,
      contactId: pkg.student.contact_id,
      language: pkg.student.language,
      level: pkg.student.level,
      goals: pkg.student.goals,
      status: pkg.student.status,
      contact: {
        id: pkg.student.contact.id,
        fullName: pkg.student.contact.full_name,
        email: pkg.student.contact.email,
        phone: pkg.student.contact.phone,
        phoneE164: pkg.student.contact.phone_e164,
        whatsapp: pkg.student.contact.whatsapp,
        preferredChannel: pkg.student.contact.preferred_channel,
        referralSourceText: pkg.student.contact.referral_source_text,
        referralContactId: pkg.student.contact.referral_contact_id,
        locationCity: pkg.student.contact.location_city,
        locationCountry: pkg.student.contact.location_country,
        tags: pkg.student.contact.tags,
        notes: pkg.student.contact.notes,
        createdAt: pkg.student.contact.created_at,
      },
    },
  }))

  return packages
}

/**
 * 🗓️ Fetches class sessions for the initial server render
 * MODIFIED: Returns ClassSession[] per Fixes doc
 */
export async function getSessionsForCalendar(
  rangeStart: string,
  rangeEnd: string
): Promise<ClassSession[]> {
  // This function now mirrors getSessionsForRange
  return getSessionsForRange(rangeStart, rangeEnd)
}

/**
 * 🗓️ (NEW) Fetches class sessions for a given date range for client-side updates
 * Returns raw ClassSession[] with student and package info joined.
 */
export async function getSessionsForRange(
  rangeStart: string,
  rangeEnd: string
): Promise<ClassSession[]> {
  const supabase = await createSupabaseServerClient()

  const { data: sessionsData, error } = await supabase
    .from('class_sessions')
    .select(
      `
      *,
      student:class_students (
        *,
        contact:contacts (*)
      ),
      package:class_packages (
        title
      )
    `
    )
    .gte('start_time', rangeStart)
    .lte('start_time', rangeEnd) // Use start_time for lte as well

  if (error) {
    console.error('Error fetching sessions for range:', error.message)
    return []
  }

  // Map DB session to ClassSession TS type
  const sessions: ClassSession[] = sessionsData.map((session) => ({
    id: session.id,
    studentId: session.student_id,
    groupId: session.group_id,
    packageId: session.package_id,
    startTime: session.start_time,
    endTime: session.end_time,
    timezone: session.timezone,
    locationType: session.location_type,
    locationDetail: session.location_detail,
    attendance: session.attendance,
    notes: session.notes,
    // Add joined data
    student: session.student
      ? {
          id: session.student.id,
          contactId: session.student.contact_id,
          language: session.student.language,
          level: session.student.level,
          goals: session.student.goals,
          status: session.student.status,
          contact: session.student.contact
            ? {
                id: session.student.contact.id,
                fullName: session.student.contact.full_name,
                email: session.student.contact.email,
                phone: session.student.contact.phone,
                phoneE164: session.student.contact.phone_e164,
                whatsapp: session.student.contact.whatsapp,
                preferredChannel: session.student.contact.preferred_channel,
                referralSourceText:
                  session.student.contact.referral_source_text,
                referralContactId: session.student.contact.referral_contact_id,
                locationCity: session.student.contact.location_city,
                locationCountry: session.student.contact.location_country,
                tags: session.student.contact.tags,
                notes: session.student.contact.notes,
                createdAt: session.student.contact.created_at,
              }
            : undefined,
        }
      : undefined,
    package: session.package
      ? {
          // This is a partial ClassPackage, only mapping what we queried
          id: session.package_id || '',
          title: session.package.title,
          // Fill in dummy data for other required fields
          studentId: session.student_id || '',
          sessionsIncluded: 0,
          sessionsConsumed: 0,
          priceDopCents: 0,
          status: 'active',
        }
      : undefined,
  }))

  return sessions
}

/**
 * 📊 Fetches dashboard KPIs using the DB function
 * Implements logic from Plan
 */
export async function getClassesDashboardData(): Promise<{
  activeStudents: number
  renewalsDue: number
  avgAttendance: number
}> {
  const supabase = await createSupabaseServerClient()

  // Call the database function `get_classes_dashboard_data`
  const { data, error } = await supabase.rpc('get_classes_dashboard_data')

  if (error) {
    console.error('Error fetching dashboard KPIs:', error.message)
    return { activeStudents: 0, renewalsDue: 0, avgAttendance: 0 }
  }

  // RPC returns a single object in an array
  const kpis = data[0]
  return {
    activeStudents: kpis.active_students,
    renewalsDue: kpis.renewals_due,
    // Convert numeric to a percentage
    avgAttendance: Math.round((kpis.avg_attendance || 0) * 100),
  }
}

/**
 * 🧑‍🎓 Creates a new student
 * MODIFIED: This function now checks for an existing contact by email
 * before creating a new one, preventing the "duplicate key" error.
 * It also omits the 'whatsapp' field.
 */
export async function createStudent(
  id: string | undefined, // This will be undefined, ignored.
  input: StudentFormData // This will be the full form data.
) {
  const supabase = await createSupabaseServerClient()
  let contactId: string | null = null

  // 1. Check if contact exists by email, if email is provided
  if (input.email) {
    const { data: existingContact, error: selectError } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', input.email)
      .single()

    if (existingContact) {
      contactId = existingContact.id
    } else if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine.
      console.error('Error selecting contact:', selectError.message)
      return { data: null, error: selectError }
    }
  }

  // 2. If contact does not exist (!contactId), create it
  if (!contactId) {
    const { data: newContact, error: insertError } = await supabase
      .from('contacts')
      .insert({
        full_name: input.fullName,
        email: input.email || null,
        phone: input.phone || null,
        // `whatsapp` field is UI-only and not in the DB schema, so it's omitted.
        preferred_channel: 'whatsapp', // Default
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Error creating contact:', insertError.message)
      return { data: null, error: insertError }
    }
    contactId = newContact.id
  }

  // 3. Now, create the ClassStudent profile with the contactId
  const { data, error } = await supabase
    .from('class_students')
    .insert({
      contact_id: contactId,
      language: input.language,
      level: input.level,
      status: input.status || 'active',
      goals: input.goals,
    })
    .select()
    .single()

  if (error) {
    // This will catch if a student profile already exists for this contact
    console.error('Error creating student profile:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { data, error: null }
}

/**
 * 🧑‍🎓 Updates an existing student
 * MODIFIED: Signature matches the call from ClassesClient.
 * Only updates student fields, as contact fields are disabled in the form.
 */
export async function updateStudent(
  id: string, // This is the studentId
  input: StudentFormData // This is the full form data
) {
  const supabase = await createSupabaseServerClient()

  // This function ONLY updates the class_student profile.
  // Contact info is not edited from this form.
  const { data, error } = await supabase
    .from('class_students')
    .update({
      language: input.language,
      level: input.level,
      status: input.status,
      goals: input.goals,
    })
    .eq('id', id) // Use the `id` argument which is the studentId
    .select()
    .single()

  if (error) {
    console.error('Error updating student:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { data, error: null }
}

/**
 * 🧑‍🎓 Deletes a student
 * Implements logic from Plan
 */
export async function deleteStudent(id: string) {
  const supabase = await createSupabaseServerClient()

  // Note: RLS/foreign keys should handle cascade, or it should be
  // handled here or in a DB function (e.g., delete contact too?)
  const { error } = await supabase.from('class_students').delete().eq('id', id)

  if (error) {
    console.error('Error deleting student:', error.message)
    return { error }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { error: null }
}

/**
 * 📦 Creates a new package
 * Implements logic from Plan
 */
export async function createPackage(input: CreatePackageInput) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('class_packages')
    .insert({
      student_id: input.studentId,
      title: input.title,
      sessions_included: input.sessionsIncluded,
      price_dop_cents: input.priceDopCents,
      status: input.status || 'active',
      start_date: input.startDate,
      end_date: input.endDate,
      sessions_consumed: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating package:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { data, error: null }
}

/**
 * 📦 Updates an existing package
 * Implements logic from Plan
 */
export async function updatePackage(id: string, input: UpdatePackageInput) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('class_packages')
    .update({
      title: input.title,
      sessions_included: input.sessionsIncluded,
      price_dop_cents: input.priceDopCents,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating package:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { data, error: null }
}

/**
 * 📦 Renews a package: marks old as complete, creates a new one
 * Implements logic from Plan
 * WARNING: This is not transactional and can fail midway.
 * A database RPC is recommended for production.
 */
export async function renewPackage(
  sourcePackageId: string,
  newDates: { startDate?: string | null; endDate?: string | null }
) {
  const supabase = await createSupabaseServerClient()

  // 1. Get the source package data
  const { data: sourcePackage, error: fetchError } = await supabase
    .from('class_packages')
    .select('*')
    .eq('id', sourcePackageId)
    .single()

  if (fetchError || !sourcePackage) {
    console.error('Error fetching source package for renewal:', fetchError)
    return { data: null, error: fetchError || new Error('Package not found') }
  }

  // 2. Mark the original package as 'completed'
  const { error: updateError } = await supabase
    .from('class_packages')
    .update({ status: 'completed' })
    .eq('id', sourcePackageId)

  if (updateError) {
    console.error('Error marking old package as completed:', updateError.message)
    return { data: null, error: updateError }
  }

  // 3. Create the new package
  const { data: newPackage, error: createError } = await supabase
    .from('class_packages')
    .insert({
      student_id: sourcePackage.student_id,
      title: sourcePackage.title,
      sessions_included: sourcePackage.sessions_included,
      price_dop_cents: sourcePackage.price_dop_cents,
      sessions_consumed: 0,
      status: 'active',
      start_date: newDates.startDate,
      end_date: newDates.endDate,
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating new renewed package:', createError.message)
    // TODO: Attempt to roll back the 'completed' status on the original package?
    return { data: null, error: createError }
  }

  revalidatePath('/(app)/classes', 'layout')
  return { data: newPackage, error: null }
}

/**
 * 🗓️ Creates a new session
 * MODIFIED: Validates studentId is present per Fixes doc
 */
export async function createSession(
  input: CreateSessionInput
): Promise<{ data: ClassSession | null; error: any }> {
  // 1. Validate input against schema
  const parseResult = createSessionSchema.safeParse(input)
  if (!parseResult.success) {
    console.error('Error creating session: Invalid input', parseResult.error)
    return { data: null, error: { message: 'Invalid input' } }
  }

  // This check is now handled by the zod schema
  // if (!parseResult.data.studentId) { ... }

  const supabase = await createSupabaseServerClient()

  // 2. Insert validated data
  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      student_id: parseResult.data.studentId,
      group_id: parseResult.data.groupId,
      package_id: parseResult.data.packageId,
      start_time: parseResult.data.startTime,
      end_time: parseResult.data.endTime,
      timezone: parseResult.data.timezone,
      location_type: parseResult.data.locationType,
      location_detail: parseResult.data.locationDetail,
      attendance: parseResult.data.attendance || 'scheduled',
      notes: parseResult.data.notes,
    })
    .select(
      `
      *,
      student:class_students (
        *,
        contact:contacts (*)
      ),
      package:class_packages (
        title
      )
    `
    )
    .single()

  if (error) {
    console.error('Error creating session:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  // 3. Map the returned data to the full ClassSession type
  const session = data
  const fullSession: ClassSession = {
    id: session.id,
    studentId: session.student_id,
    groupId: session.group_id,
    packageId: session.package_id,
    startTime: session.start_time,
    endTime: session.end_time,
    timezone: session.timezone,
    locationType: session.location_type,
    locationDetail: session.location_detail,
    attendance: session.attendance,
    notes: session.notes,
    student: session.student
      ? {
          id: session.student.id,
          contactId: session.student.contact_id,
          language: session.student.language,
          level: session.student.level,
          goals: session.student.goals,
          status: session.student.status,
          contact: session.student.contact
            ? {
                id: session.student.contact.id,
                fullName: session.student.contact.full_name,
                email: session.student.contact.email,
                phone: session.student.contact.phone,
                phoneE164: session.student.contact.phone_e164,
                whatsapp: session.student.contact.whatsapp,
                preferredChannel: session.student.contact.preferred_channel,
                referralSourceText:
                  session.student.contact.referral_source_text,
                referralContactId: session.student.contact.referral_contact_id,
                locationCity: session.student.contact.location_city,
                locationCountry: session.student.contact.location_country,
                tags: session.student.contact.tags,
                notes: session.student.contact.notes,
                createdAt: session.student.contact.created_at,
              }
            : undefined,
        }
      : undefined,
    package: session.package
      ? {
          id: session.package_id || '',
          title: session.package.title,
          studentId: session.student_id || '',
          sessionsIncluded: 0,
          sessionsConsumed: 0,
          priceDopCents: 0,
          status: 'active',
        }
      : undefined,
  }

  return { data: fullSession, error: null }
}

/**
 * 🗓️ Updates an existing session
 * MODIFIED: Accepts a patch for calendar drag/drop per Fixes doc
 */
export async function updateSession(
  id: string,
  patch: SessionPatch
): Promise<{ data: ClassSession | null; error: any }> {
  const supabase = await createSupabaseServerClient()

  // Map camelCase patch to snake_case for DB
  const dbPatch = {
    start_time: patch.startTime,
    end_time: patch.endTime,
    attendance: patch.attendance,
  }

  // Remove undefined keys so they are not updated to null
  Object.keys(dbPatch).forEach(
    (key) =>
      (dbPatch as any)[key] === undefined && delete (dbPatch as any)[key]
  )

  const { data, error } = await supabase
    .from('class_sessions')
    .update(dbPatch)
    .eq('id', id)
    .select(
      `
      *,
      student:class_students (
        *,
        contact:contacts (*)
      ),
      package:class_packages (
        title
      )
    `
    )
    .single()

  if (error) {
    console.error('Error updating session:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  // Map the returned data to the full ClassSession type
  const session = data
  const fullSession: ClassSession = {
    id: session.id,
    studentId: session.student_id,
    groupId: session.group_id,
    packageId: session.package_id,
    startTime: session.start_time,
    endTime: session.end_time,
    timezone: session.timezone,
    locationType: session.location_type,
    locationDetail: session.location_detail,
    attendance: session.attendance,
    notes: session.notes,
    student: session.student
      ? {
          id: session.student.id,
          contactId: session.student.contact_id,
          language: session.student.language,
          level: session.student.level,
          goals: session.student.goals,
          status: session.student.status,
          contact: session.student.contact
            ? {
                id: session.student.contact.id,
                fullName: session.student.contact.full_name,
                email: session.student.contact.email,
                phone: session.student.contact.phone,
                phoneE164: session.student.contact.phone_e164,
                whatsapp: session.student.contact.whatsapp,
                preferredChannel: session.student.contact.preferred_channel,
                referralSourceText:
                  session.student.contact.referral_source_text,
                referralContactId: session.student.contact.referral_contact_id,
                locationCity: session.student.contact.location_city,
                locationCountry: session.student.contact.location_country,
                tags: session.student.contact.tags,
                notes: session.student.contact.notes,
                createdAt: session.student.contact.created_at,
              }
            : undefined,
        }
      : undefined,
    package: session.package
      ? {
          id: session.package_id || '',
          title: session.package.title,
          studentId: session.student_id || '',
          sessionsIncluded: 0,
          sessionsConsumed: 0,
          priceDopCents: 0,
          status: 'active',
        }
      : undefined,
  }

  return { data: fullSession, error: null }
}

/**
 * 🗓️ Sets the attendance for a session
 * Implements logic from Plan
 * DB Trigger 'sync_package_consumption' handles side effects.
 * MODIFIED: Returns the full ClassSession object for client state sync
 */
export async function setAttendance(
  id: string,
  attendance: AttendanceStatus
): Promise<{ data: ClassSession | null; error: any }> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('class_sessions')
    .update({ attendance: attendance })
    .eq('id', id)
    .select(
      `
      *,
      student:class_students (
        *,
        contact:contacts (*)
      ),
      package:class_packages (
        title
      )
    `
    )
    .single()

  if (error) {
    console.error('Error setting attendance:', error.message)
    return { data: null, error }
  }

  revalidatePath('/(app)/classes', 'layout')
  // Map the returned data to the full ClassSession type
  const session = data
  const fullSession: ClassSession = {
    id: session.id,
    studentId: session.student_id,
    groupId: session.group_id,
    packageId: session.package_id,
    startTime: session.start_time,
    endTime: session.end_time,
    timezone: session.timezone,
    locationType: session.location_type,
    locationDetail: session.location_detail,
    attendance: session.attendance,
    notes: session.notes,
    student: session.student
      ? {
          id: session.student.id,
          contactId: session.student.contact_id,
          language: session.student.language,
          level: session.student.level,
          goals: session.student.goals,
          status: session.student.status,
          contact: session.student.contact
            ? {
                id: session.student.contact.id,
                fullName: session.student.contact.full_name,
                email: session.student.contact.email,
                phone: session.student.contact.phone,
                phoneE164: session.student.contact.phone_e164,
                whatsapp: session.student.contact.whatsapp,
                preferredChannel: session.student.contact.preferred_channel,
                referralSourceText:
                  session.student.contact.referral_source_text,
                referralContactId: session.student.contact.referral_contact_id,
                locationCity: session.student.contact.location_city,
                locationCountry: session.student.contact.location_country,
                tags: session.student.contact.tags,
                notes: session.student.contact.notes,
                createdAt: session.student.contact.created_at,
              }
            : undefined,
        }
      : undefined,
    package: session.package
      ? {
          id: session.package_id || '',
          title: session.package.title,
          studentId: session.student_id || '',
          sessionsIncluded: 0,
          sessionsConsumed: 0,
          priceDopCents: 0,
          status: 'active',
        }
      : undefined,
  }

  return { data: fullSession, error: null }
}

/**
 * 🧑‍🎓 Fetches detailed info for a single student (Not in Plan, but was in Mock)
 * This is a bonus function derived from the mock
 */
export async function getStudentDetails(
  studentId: string
): Promise<{
  student: ClassStudent
  packages: ClassPackage[]
  sessions: ClassSession[]
} | null> {
  const supabase = await createSupabaseServerClient()

  const { data: studentData, error: studentError } = await supabase
    .from('class_students')
    .select(
      `
      *,
      contact:contacts!inner(*)
    `
    )
    .eq('id', studentId)
    .single()

  if (studentError || !studentData) {
    console.error('Error fetching student details:', studentError?.message)
    return null
  }

  // Get all packages for this student
  const { data: packagesData, error: packagesError } = await supabase
    .from('class_packages')
    .select('*')
    .eq('student_id', studentId)
    .order('start_date', { ascending: false })

  // Get all sessions for this student
  const { data: sessionsData, error: sessionsError } = await supabase
    .from('class_sessions')
    .select('*')
    .eq('student_id', studentId)
    .order('start_time', { ascending: false })

  if (packagesError || sessionsError) {
    console.error(
      'Error fetching student sub-data:',
      packagesError,
      sessionsError
    )
    // Return partial data if student was found
  }

  // Map all data to camelCase TS types
  const student: ClassStudent = {
    id: studentData.id,
    contactId: studentData.contact_id,
    language: studentData.language,
    level: studentData.level,
    status: studentData.status,
    goals: studentData.goals,
    contact: {
      id: studentData.contact.id,
      fullName: studentData.contact.full_name,
      email: studentData.contact.email,
      phone: studentData.contact.phone,
      phoneE164: studentData.contact.phone_e164,
      whatsapp: studentData.contact.whatsapp,
      preferredChannel: studentData.contact.preferred_channel,
      referralSourceText: studentData.contact.referral_source_text,
      referralContactId: studentData.contact.referral_contact_id,
      locationCity: studentData.contact.location_city,
      locationCountry: studentData.contact.location_country,
      tags: studentData.contact.tags,
      notes: studentData.contact.notes,
      createdAt: studentData.contact.created_at,
    },
  }

  const packages: ClassPackage[] = (packagesData || []).map(
    (pkg): ClassPackage => ({
      id: pkg.id,
      studentId: pkg.student_id,
      title: pkg.title,
      sessionsIncluded: pkg.sessions_included,
      sessionsConsumed: pkg.sessions_consumed,
      priceDopCents: pkg.price_dop_cents,
      status: pkg.status,
      startDate: pkg.start_date,
      endDate: pkg.end_date,
    })
  )

  const sessions: ClassSession[] = (sessionsData || []).map(
    (session): ClassSession => ({
      id: session.id,
      studentId: session.student_id,
      groupId: session.group_id,
      packageId: session.package_id,
      startTime: session.start_time,
      endTime: session.end_time,
      timezone: session.timezone,
      locationType: session.location_type,
      locationDetail: session.location_detail,
      attendance: session.attendance,
      notes: session.notes,
      // Note: student/package info is not joined here
    })
  )

  return {
    student,
    packages,
    sessions,
  }
}