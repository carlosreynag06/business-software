// app/(app)/classes/page.tsx
import * as React from 'react'
import {
  getStudentsList,
  getAllPackages,
  getSessionsForCalendar,
  getClassesDashboardData,
} from './actions'
import ClassesClient from './ClassesClient'
// MODIFIED: Import ClassSession instead of CalendarEvent
import type { ClassStudent, ClassPackage, ClassSession } from '@/lib/types'

// Helper to get a date range for the calendar (e.g., this month)
// This is just for the initial server load
const getInitialCalendarRange = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

export default async function ClassesServerPage() {
  const { startISO, endISO } = getInitialCalendarRange()

  // Fetch all data in parallel
  const [
    studentsData,
    packagesData,
    sessionsData, // This is now ClassSession[]
    kpisData,
  ] = await Promise.all([
    getStudentsList(),
    getAllPackages(),
    getSessionsForCalendar(startISO, endISO),
    getClassesDashboardData(),
  ])

  // Safe fallbacks
  const safeStudents: ClassStudent[] = Array.isArray(studentsData)
    ? studentsData
    : []
  const safePackages: ClassPackage[] = Array.isArray(packagesData)
    ? packagesData
    : []
  // MODIFIED: Type is now ClassSession[]
  const safeSessions: ClassSession[] = Array.isArray(sessionsData)
    ? sessionsData
    : []
  const safeKpis = kpisData ?? {
    activeStudents: 0,
    renewalsDue: 0,
    avgAttendance: 0,
  }

  return (
    <ClassesClient
      initialStudents={safeStudents}
      initialPackages={safePackages}
      initialSessions={safeSessions} // This now correctly passes ClassSession[]
      initialKpis={safeKpis}
    />
  )
}