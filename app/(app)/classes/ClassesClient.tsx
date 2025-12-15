// app/(app)/classes/ClassesClient.tsx
'use client'

import React, {
  useState,
  useMemo,
  useEffect,
  useTransition,
  useRef,
} from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  ClassStudent,
  ClassPackage,
  // CalendarEvent, // We now use ClassSession
  ClassLanguage,
  PackageStatus,
  ClassSession,
  Payment,
  AttendanceStatus,
} from '@/lib/types'
import {
  ATTENDANCE_STATUSES, // Import the values
} from '@/lib/types'
import {
  createStudent,
  updateStudent,
  deleteStudent,
  createPackage,
  updatePackage,
  createSession,
  updateSession,
  getStudentDetails,
  setAttendance,
  renewPackage,
  getSessionsForRange, // Import the new action
} from './actions'
// Import payment action
import { upsertPayment } from '@/app/(app)/payments/actions'
import {
  Users,
  Package,
  Calendar,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Loader2,
  X,
  Edit,
} from 'lucide-react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type {
  EventInput,
  DateClickArg,
  EventClickArg,
  EventDropArg,
  EventResizeDoneArg,
  DateRange,
  SelectArg,
} from '@fullcalendar/core'
import { Button } from '@/components/ui/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

// Import the new components
import StudentList from '@/components/classes/StudentList'
import StudentDetailModal from '@/components/classes/StudentDetailModal'
import StudentFormModal from '@/components/classes/StudentFormModal'
import PackageList from '@/components/classes/PackageList'
import PackageFormModal from '@/components/classes/PackageFormModal'
import SessionFormModal from '@/components/classes/SessionFormModal'
// Import the payment modal
import PaymentFormModal from '@/components/payments/PaymentFormModal'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/
type View = 'students' | 'packages' | 'scheduler'

const ALL_PACKAGE_STATUSES: PackageStatus[] = [
  'active',
  'completed',
  'expired',
]

type KpiData = {
  activeStudents: number
  renewalsDue: number
  avgAttendance: number
}

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
// Icon map for KPIs
const kpiIcons = {
  activeStudents: Users,
  renewalsDue: Clock,
  avgAttendance: CheckCircle,
}

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


// Helper for formatting toast messages
const formatCurrencyRD = (valueInCents: number | undefined) => {
  if (valueInCents === undefined) valueInCents = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueInCents / 100) // Convert cents to DOP
}

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
interface ClassesClientProps {
  initialStudents: ClassStudent[]
  initialPackages: ClassPackage[]
  initialSessions: ClassSession[] // MODIFIED: Use ClassSession
  initialKpis: KpiData
}

export default function ClassesClient({
  initialStudents,
  initialPackages,
  initialSessions,
  initialKpis,
}: ClassesClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()

  // --- View State ---
  const [view, setView] = useState<View>('students')

  // --- Data State ---
  const [students, setStudents] = useState(initialStudents)
  const [packages, setPackages] = useState(initialPackages)
  const [sessions, setSessions] = useState<ClassSession[]>(initialSessions) // MODIFIED: Use ClassSession
  const [kpis, setKpis] = useState(initialKpis)

  // --- Filter State ---
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLanguage, setFilterLanguage] = useState<'all' | ClassLanguage>(
    'all'
  )
  const [filterPackageStatus, setFilterPackageStatus] =
    useState<'all' | PackageStatus>('all')

  // --- Modal State ---
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(
    null
  )

  const [isStudentFormModalOpen, setIsStudentFormModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<ClassStudent | null>(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const [isPackageFormModalOpen, setIsPackageFormModalOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<ClassPackage | null>(null)
  const [packageStudentId, setPackageStudentId] = useState<string | null>(null)

  const [isSessionFormModalOpen, setIsSessionFormModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null)
  const [sessionInitialData, setSessionInitialData] = useState<Partial<
    ClassSession
  > | null>(null)

  // --- Popover State (NEW) ---
  const [popoverTarget, setPopoverTarget] = useState<HTMLElement | null>(null)
  const [popoverSession, setPopoverSession] = useState<ClassSession | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // ADDED: State for the Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentInitialData, setPaymentInitialData] =
    useState<Partial<Payment> | null>(null)

  // Sync server data to client state (for after router.refresh())
  useEffect(() => setStudents(initialStudents), [initialStudents])
  useEffect(() => setPackages(initialPackages), [initialPackages])
  useEffect(() => setSessions(initialSessions), [initialSessions])
  useEffect(() => setKpis(initialKpis), [initialKpis])

  // --- Memos for Filtered Data ---
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const query = searchQuery.toLowerCase()
      const nameMatch = student.contact?.fullName.toLowerCase().includes(query)
      const emailMatch = student.contact?.email?.toLowerCase().includes(query)
      const langMatch =
        filterLanguage === 'all' || student.language === filterLanguage
      return (nameMatch || emailMatch) && langMatch
    })
  }, [students, searchQuery, filterLanguage])

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (!pkg) return false
      const query = searchQuery.toLowerCase()
      const studentName = pkg.student?.contact?.fullName.toLowerCase() || ''
      const nameMatch = studentName.includes(query)
      const statusMatch =
        filterPackageStatus === 'all' || pkg.status === filterPackageStatus
      return nameMatch && statusMatch
    })
  }, [packages, searchQuery, filterPackageStatus])

  // MODIFIED: This now maps ClassSession to EventInput
  const calendarEvents = useMemo((): EventInput[] => {
    return sessions.map((session) => {
      // Set class name for styling based on attendance
      let className = 'event-scheduled' // Default
      if (session.attendance === 'assisted') {
        className = 'event-assisted'
      } else if (session.attendance === 'cancelled') {
        className = 'event-cancelled'
      }

      return {
        id: session.id,
        start: session.startTime,
        end: session.endTime,
        allDay: false,
        // (BUG FIX) Title is removed here.
        // It will be rendered by renderEventContent instead.
        className: className,
        // Pass all session data to extendedProps for the renderer
        extendedProps: session,
      }
    })
  }, [sessions])

  // --- Student Handlers ---
  const handleOpenAddStudentModal = () => {
    setEditingStudent(null)
    setIsStudentFormModalOpen(true)
  }

  const handleOpenEditStudentModal = (student: ClassStudent) => {
    setEditingStudent(student)
    setIsStudentFormModalOpen(true)
  }

  const handleOpenDetailModal = (student: ClassStudent) => {
    setSelectedStudent({ ...student, packages: [], sessions: [] })
    setIsDetailLoading(true)
    startTransition(async () => {
      const details = await getStudentDetails(student.id)
      if (details) {
        setSelectedStudent({
          ...details.student,
          packages: details.packages,
          sessions: details.sessions,
        })
      } else {
        notify({
          title: 'Error',
          description: 'Could not fetch student details',
          variant: 'danger',
        })
        setSelectedStudent(null)
      }
      setIsDetailLoading(false)
    })
  }

  const handleCloseDetailModal = () => {
    setSelectedStudent(null)
    setIsDetailLoading(false)
  }

  const handleSaveStudent = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const action = isEditing ? updateStudent : createStudent
      const result = await action(formData.id, formData)

      if (result.error) {
        notify({
          title: 'Save Failed',
          description: result.error.message,
          variant: 'danger',
        })
      } else {
        notify({
          title: `Student ${isEditing ? 'Updated' : 'Created'}`,
          description: `${formData.fullName} has been saved`,
          variant: 'success',
        })
        setIsStudentFormModalOpen(false)
        setEditingStudent(null)
        router.refresh()
      }
    })
  }

  const handleOpenDeleteConfirm = (student: ClassStudent) => {
    setEditingStudent(student)
    setIsConfirmDeleteOpen(true)
  }

  const handleDeleteStudent = () => {
    if (!editingStudent) return
    startTransition(async () => {
      const result = await deleteStudent(editingStudent.id)
      if (result.error) {
        notify({
          title: 'Delete Failed',
          description: result.error.message,
          variant: 'danger',
        })
      } else {
        notify({
          title: 'Student Deleted',
          description: `${editingStudent.contact.fullName} has been deleted`,
          variant: 'success',
        })
        setIsConfirmDeleteOpen(false)
        setEditingStudent(null)
        router.refresh()
      }
    })
  }

  // --- Package Handlers ---
  const handleOpenAddPackageModal = (studentId: string) => {
    setEditingPackage(null)
    setPackageStudentId(studentId)
    setIsPackageFormModalOpen(true)
    handleCloseDetailModal()
  }

  const handleSavePackage = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const action = isEditing ? updatePackage : createPackage
      const result = isEditing
        ? await action(formData.id, formData)
        : await action(formData)

      if (result.error) {
        notify({
          title: 'Save Failed',
          description: result.error.message,
          variant: 'danger',
        })
      } else {
        notify({
          title: `Package ${isEditing ? 'Updated' : 'Created'}`,
          description: `${formData.title} for ${formatCurrencyRD(
            formData.priceDopCents
          )} has been saved.`,
          variant: 'success',
        })
        setIsPackageFormModalOpen(false)
        setEditingPackage(null)
        setPackageStudentId(null)
        router.refresh()
      }
    })
  }

  // --- Session & Calendar Handlers (MODIFIED) ---

  // (NEW) Fetches sessions when FullCalendar navigates
  const fetchSessionsForRange = async (start: Date, end: Date) => {
    startTransition(async () => {
      const newSessions = await getSessionsForRange(
        start.toISOString(),
        end.toISOString()
      )
      setSessions(newSessions)
    })
  }

  // (NEW) Wrapper to open the session modal
  const openSessionModal = (initialData: Partial<ClassSession>) => {
    setEditingSession(null)
    setSessionInitialData(initialData)
    setIsSessionFormModalOpen(true)
    handleClosePopover() // Close popover if open
  }

  // (NEW) Handles clicking a date slot
  const handleDateClick = (arg: DateClickArg) => {
    openSessionModal({
      startTime: arg.date.toISOString(),
      endTime: new Date(arg.date.getTime() + 60 * 60000).toISOString(),
    })
  }

  // (NEW) Handles dragging to select a time range
  const handleSelectSlot = (arg: SelectArg) => {
    openSessionModal({
      startTime: arg.start.toISOString(),
      endTime: arg.end.toISOString(),
    })
  }

  // (MODIFIED) Handles clicking an existing event
  const handleEventClick = (arg: EventClickArg) => {
    // (BUG FIX) Find session from the current `sessions` state, not stale props
    const fullSession = sessions.find((s) => s.id === arg.event.id)
    if (fullSession) {
      setPopoverSession(fullSession)
      setPopoverTarget(arg.el) // Anchor popover to the event element
    } else {
      notify({
        title: 'Error',
        description: 'Could not find session details.',
        variant: 'danger',
      })
    }
  }

  // (NEW) Handles saving a drag-and-drop action
  const handleEventDrop = (arg: EventDropArg) => {
    startTransition(async () => {
      const patch = {
        startTime: arg.event.start?.toISOString(),
        endTime: arg.event.end?.toISOString(),
      }
      const { data, error } = await updateSession(arg.event.id, patch)
      if (error) {
        notify({
          title: 'Update Failed',
          description: 'Could not save event change. Reverting.',
          variant: 'danger',
        })
        arg.revert() // Revert visual change
      } else {
        notify({ title: 'Session Updated', variant: 'success' })
        // (BUG FIX) Refresh router to get all new data
        router.refresh()
      }
    })
  }

  // (NEW) Handles saving a resize action
  const handleEventResize = (arg: EventResizeDoneArg) => {
    startTransition(async () => {
      const patch = {
        startTime: arg.event.start?.toISOString(),
        endTime: arg.event.end?.toISOString(),
      }
      const { data, error } = await updateSession(arg.event.id, patch)
      if (error) {
        notify({
          title: 'Update Failed',
          description: 'Could not save event resize. Reverting.',
          variant: 'danger',
        })
        arg.revert() // Revert visual change
      } else {
        notify({ title: 'Session Resized', variant: 'success' })
        // (BUG FIX) Refresh router to get all new data
        router.refresh()
      }
    })
  }

  // (BUG FIX) Saves session and calls router.refresh()
  const handleSaveSession = (formData: any) => {
    startTransition(async () => {
      const isEditing = !!formData.id
      const action = isEditing
        ? () => updateSession(formData.id, formData)
        : () => createSession(formData)

      const { data, error } = await action()

      if (error) {
        notify({
          title: 'Save Failed',
          description: error.message || 'Could not save session.',
          variant: 'danger',
        })
      } else if (data) {
        notify({
          title: `Session ${isEditing ? 'Updated' : 'Created'}`,
          description: `Session has been saved.`,
          variant: 'success',
        })
        setIsSessionFormModalOpen(false)
        setEditingSession(null)
        setSessionInitialData(null)

        // (BUG FIX) Refresh router to update all views
        router.refresh()
      }
    })
  }

  // --- Popover Handlers (NEW) ---
  const handleClosePopover = () => {
    setPopoverTarget(null)
    setPopoverSession(null)
  }

  // (BUG FIX) Added router.refresh() to update package progress
  const handleSetAttendanceFromPopover = (status: AttendanceStatus) => {
    if (!popoverSession) return
    const sessionId = popoverSession.id

    startTransition(async () => {
      const { data, error } = await setAttendance(sessionId, status)
      if (error) {
        notify({
          title: 'Update Failed',
          description: error.message,
          variant: 'danger',
        })
      } else if (data) {
        notify({ title: 'Attendance Updated', variant: 'success' })
        // (BUG FIX) Refresh router to update all lists and KPIs
        router.refresh()
      }
    })
    handleClosePopover()
  }

  const handleEditFromPopover = () => {
    if (!popoverSession) return
    setEditingSession(popoverSession)
    setSessionInitialData(popoverSession)
    setIsSessionFormModalOpen(true)
    handleClosePopover()
  }

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        popoverTarget &&
        !popoverTarget.contains(event.target as Node)
      ) {
        handleClosePopover()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [popoverTarget])

  // --- Payment Handler (MODIFIED) ---
  const handleOpenPaymentModal = (studentId?: string) => {
    handleCloseDetailModal() // Close student detail
    setPaymentInitialData({
      studentId: studentId, // Pre-fill the student ID
    })
    setIsPaymentModalOpen(true)
  }

  // ADDED: Save handler for the payment modal
  const handleSavePayment = (formData: any) => {
    startTransition(async () => {
      const result = await upsertPayment(formData)

      if (result.success && result.data) {
        notify({
          title: `Payment Saved`,
          description: `Payment of ${formatCurrencyRD(
            result.data.amountDopCents
          )} saved.`,
          variant: 'success',
        })
        setIsPaymentModalOpen(false)
        setPaymentInitialData(null)
        router.refresh() // Refresh data
      } else {
        notify({
          title: 'Save Failed',
          description: result.error || 'Could not save the payment.',
          variant: 'danger',
        })
      }
    })
  }

  // (BUG FIX) This handler also needs router.refresh()
  const handleSetAttendance = (sessionId: string, newStatus: AttendanceStatus) => {
    startTransition(async () => {
      const { data, error } = await setAttendance(sessionId, newStatus)
      if (error) {
        notify({
          title: 'Update Failed',
          description: error.message,
          variant: 'danger',
        })
      } else {
        notify({
          title: 'Attendance Updated',
          description: `Session marked as ${newStatus}`,
          variant: 'success',
        })

        // (BUG FIX) Refresh router to update all lists and KPIs
        // This will also close the detail modal, which is acceptable
        router.refresh()
      }
    })
  }

  // Handler for StudentDetailModal to renew package
  const handleRenewPackage = (pkg: ClassPackage) => {
    handleCloseDetailModal()
    setEditingPackage({
      ...pkg,
      id: undefined,
      status: 'active',
      sessionsConsumed: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    })
    setPackageStudentId(pkg.studentId)
    setIsPackageFormModalOpen(true)
    notify({
      title: 'Renew Package',
      description: `Pre-filled form from ${pkg.title}. Set new dates.`,
    })
  }

  return (
    <>
      <style jsx global>{`
        /* FullCalendar Styles */
        .fc-event-main-wrapper {
          overflow: hidden;
          padding: 2px 4px;
          line-height: 1.3;
          /* color: white; */ /* Color now handled by status */
          max-height: 100%;
          min-width: 0;
        }
        /* (BUG FIX) This is the new title class for all views */
        .fc-event-title {
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fc-event-body {
          display: flex;
          flex-direction: column;
          gap: 1px;
          margin-top: 2px;
          min-width: 0;
        }
        .fc-event-row {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          opacity: 0.9;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* (BUG FIX) This is the time class for all views */
        .fc-event-time {
          font-size: 11px;
          font-weight: 600;
          margin-right: 4px;
        }

        /* --- Month View Specifics --- */
        .fc-dayGridMonth-view .fc-event-main-wrapper {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .fc-dayGridMonth-view .fc-event {
          overflow: visible !important;
        }
        .fc-dayGridMonth-view .fc-event-time {
          font-size: 10px;
          opacity: 0.9;
          font-weight: 600;
          margin-right: 3px;
        }
        .fc-dayGridMonth-view .fc-event-title {
          font-size: 11px;
          font-weight: 500;
        }
        .fc-dayGridMonth-view .fc-event-body {
          display: none;
        }

        /* --- Status Colors --- */
        .event-scheduled {
          background-color: var(--secondary) !important;
          border-color: var(--secondary) !important;
          color: white !important;
        }
        .event-assisted {
          background-color: var(--success) !important;
          border-color: var(--success) !important;
          color: white !important;
        }
        .event-cancelled {
          background-color: var(--danger) !important;
          border-color: var(--danger) !important;
          color: white !important;
          opacity: 0.7;
        }

        /* (BUG FIX) Inline Tailwind styles for non-month views */
        .event-scheduled-inline {
          background-color: #f3f4f6 !important; /* bg-gray-50 */
          border-color: #d1d5db !important; /* border-gray-300 */
          color: #1f2937 !important; /* text-gray-800 */
        }
        .event-assisted-inline {
          background-color: #f0fdf4 !important; /* bg-green-50 */
          border-color: #86efac !important; /* border-green-300 */
          color: #15803d !important; /* text-green-800 */
        }
        .event-cancelled-inline {
          background-color: #fef2f2 !important; /* bg-red-50 */
          border-color: #fca5a5 !important; /* border-red-300 */
          color: #b91c1c !important; /* text-red-800 */
          opacity: 0.9;
        }
      `}</style>
      <div className="flex h-full flex-col gap-5">
        {/* 1. Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
              Classes
            </h1>
            <p className="mt-1 text-base text-[var(--text-secondary)]">
              Manage students, packages, and class schedules
            </p>
          </div>
          <Button onClick={handleOpenAddStudentModal} disabled={isPending}>
            <Plus size={16} className="mr-2" />
            Add Student
          </Button>
        </div>

        {/* 2. KPI Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <KpiCard
            title="Active Students"
            value={kpis.activeStudents.toString()}
            icon={kpiIcons.activeStudents}
            color="primary"
          />
          <KpiCard
            title="Renewals Due (80%+ consumed)"
            value={kpis.renewalsDue.toString()}
            icon={kpiIcons.renewalsDue}
            color="warning"
          />
          <KpiCard
            title="Average Attendance"
            value={`${kpis.avgAttendance}%`}
            icon={kpiIcons.avgAttendance}
            color="success"
          />
        </div>

        {/* 3. View Toggles & Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* View Toggles */}
          <div className="flex flex-shrink-0 items-center gap-2">
            <TabButton
              label="Students"
              icon={Users}
              isActive={view === 'students'}
              onClick={() => setView('students')}
            />
            <TabButton
              label="Packages"
              icon={Package}
              isActive={view === 'packages'}
              onClick={() => setView('packages')}
            />
            <TabButton
              label="Scheduler"
              icon={Calendar}
              isActive={view === 'scheduler'}
              onClick={() => setView('scheduler')}
            />
          </div>

          {/* Filter Bar (Conditional) */}
          <div className="flex w-full min-w-0 flex-1 items-center gap-3">
            <div className="relative w-full flex-[0_0_70%]">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />
              <input
                type="text"
                placeholder={
                  view === 'students'
                    ? 'Search by student name or email'
                    : view === 'packages'
                    ? 'Search by student name'
                    : 'Search'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={clsx(inputBaseClass, 'pl-9')}
                disabled={view === 'scheduler'}
              />
            </div>

            {view === 'students' && (
              <select
                value={filterLanguage}
                onChange={(e) =>
                  setFilterLanguage(e.target.value as 'all' | ClassLanguage)
                }
                className={clsx(inputBaseClass, 'flex-[0_0_30%] appearance-none')}
              >
                <option value="all">All Languages</option>
                <option value="english">English</option>
                <option value="spanish">Spanish</option>
              </select>
            )}

            {view === 'packages' && (
              <select
                value={filterPackageStatus}
                onChange={(e) =>
                  setFilterPackageStatus(
                    e.target.value as 'all' | PackageStatus
                  )
                }
                className={clsx(inputBaseClass, 'flex-[0_0_30%] appearance-none')}
              >
                <option value="all">All Statuses</option>
                {ALL_PACKAGE_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 4. Content Area - MODIFIED: Removed border */}
        <div className="flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-4 shadow-[var(--shadow-1)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {view === 'students' && (
                <StudentList
                  students={filteredStudents}
                  onEdit={handleOpenEditStudentModal}
                  onDelete={handleOpenDeleteConfirm}
                  onViewDetails={handleOpenDetailModal}
                  isPending={isPending}
                />
              )}
              {view === 'packages' && (
                <PackageList packages={filteredPackages} />
              )}
              {view === 'scheduler' && (
                <SchedulerView
                  events={calendarEvents}
                  // MODIFIED: Pass all new handlers
                  onDateClick={handleDateClick}
                  onEventClick={handleEventClick}
                  onEventDrop={handleEventDrop}
                  onEventResize={handleEventResize}
                  onDatesSet={(arg: DateRange) =>
                    fetchSessionsForRange(arg.start, arg.end)
                  }
                  onSelect={handleSelectSlot}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <StudentFormModal
        isOpen={isStudentFormModalOpen}
        onClose={() => setIsStudentFormModalOpen(false)}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        isSaving={isPending}
      />

      <StudentDetailModal
        student={selectedStudent}
        onClose={handleCloseDetailModal}
        isLoading={isDetailLoading}
        onOpenAddPackage={handleOpenAddPackageModal}
        onOpenScheduleSession={() =>
          handleDateClick({ date: new Date(), allDay: false } as DateClickArg)
        }
        onOpenRecordPayment={() => {
          handleOpenPaymentModal(selectedStudent?.id)
        }}
        onSetAttendance={handleSetAttendance}
        onRenewPackage={handleRenewPackage}
      />

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleDeleteStudent}
        isPending={isPending}
        title="Delete Student"
      >
        Are you sure you want to delete{' '}
        <strong>{editingStudent?.contact?.fullName}</strong>? This will also
        remove their associated packages and sessions. This action cannot be
        undone.
      </ConfirmDialog>

      <PackageFormModal
        isOpen={isPackageFormModalOpen}
        onClose={() => setIsPackageFormModalOpen(false)}
        onSave={handleSavePackage}
        initialData={editingPackage}
        studentId={packageStudentId}
        isSaving={isPending}
      />

      <SessionFormModal
        isOpen={isSessionFormModalOpen}
        onClose={() => setIsSessionFormModalOpen(false)}
        onSave={handleSaveSession}
        initialData={sessionInitialData}
        // MODIFIED: Pass students/packages for selection
        students={initialStudents}
        packages={initialPackages}
        // Use selectedStudent's ID if available (from detail modal),
        // otherwise let the form handle it (from scheduler)
        studentId={selectedStudent?.id}
        isSaving={isPending}
      />

      {/* ADDED: Payment modal, rendered here but controlled by state */}
      <PaymentFormModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handleSavePayment}
        initialData={paymentInitialData}
        isSaving={isPending}
        leads={[]} // This client does not have lead data
        students={initialStudents}
        projects={[]} // This client does not have project data
      />

      {/* (NEW) Event Action Popover */}
      <EventActionPopover
        target={popoverTarget}
        session={popoverSession}
        onClose={handleClosePopover}
        onSetAttendance={handleSetAttendanceFromPopover}
        onEdit={handleEditFromPopover}
        isPending={isPending}
        ref={popoverRef}
      />
    </>
  )
}

/*
|--------------------------------------------------------------------------
| KPI Card Sub-Component
|--------------------------------------------------------------------------
*/
function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger'
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    success: 'text-[var(--success)]',
    info: 'text-[var(--info)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
  }
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-surface)]',
            colorMap[color]
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <div>
          <div className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </div>
          <div className="font-sans text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Tab Button Sub-Component
|--------------------------------------------------------------------------
*/
function TabButton({
  label,
  icon: Icon,
  isActive,
  onClick,
}: {
  label: string
  icon: React.ElementType
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex h-10 items-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-medium shadow-[var(--shadow-1)] transition-colors',
        isActive
          ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
          : 'border-[var(--border)] bg-[var(--surface-elev-1)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
    </button>
  )
}

/*
|--------------------------------------------------------------------------
| View 3: Scheduler
|--------------------------------------------------------------------------
*/
// MODIFIED: Added all new props
function SchedulerView({
  events,
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize,
  onDatesSet,
  onSelect,
}: {
  events: EventInput[]
  onDateClick: (arg: DateClickArg) => void
  onEventClick: (arg: EventClickArg) => void
  onEventDrop: (arg: EventDropArg) => void
  onEventResize: (arg: EventResizeDoneArg) => void
  onDatesSet: (arg: DateRange) => void
  onSelect: (arg: SelectArg) => void
}) {
  return (
    <div className="h-full min-h-[70vh]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        height="100%"
        editable={true}
        selectable={true}
        eventContent={renderEventContent} // Use our custom renderer
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        timeZone="America/Santo_Domingo"
        locale="en"
        contentHeight="auto"
        // MODIFIED: Pass new handlers
        dateClick={onDateClick}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        eventResize={onEventResize}
        datesSet={onDatesSet}
        select={onSelect}
      />
    </div>
  )
}

// (BUG FIX) Custom Event Renderer
function renderEventContent(eventInfo: any) {
  // We now get the full ClassSession from extendedProps
  const session = eventInfo.event.extendedProps as ClassSession
  const isLowDensity = eventInfo.view.type === 'dayGridMonth'

  // Dynamic classes based on attendance status
  const statusClasses = {
    scheduled: 'event-scheduled-inline',
    assisted: 'event-assisted-inline',
    cancelled: 'event-cancelled-inline',
  }

  // (BUG FIX) Use student name, not package title
  const title = session.student?.contact?.fullName || 'No Student'

  return (
    <div
      className={clsx(
        'fc-event-main-wrapper',
        // This applies the inline Tailwind classes as requested in the Fixes doc
        !isLowDensity && session.attendance && statusClasses[session.attendance]
      )}
    >
      {isLowDensity ? (
        // --- Month View ---
        <div className="fc-event-main-wrapper">
          <span className="fc-event-time">{eventInfo.timeText}</span>
          <span className="fc-event-title">{title}</span>
        </div>
      ) : (
        // --- Week/Day View ---
        <>
          <div className="fc-event-title-container">
            {/* (BUG FIX) Show time and title */}
            <span className="fc-event-time">{eventInfo.timeText}</span>
            <span className="fc-event-title">{title}</span>
          </div>
          <div className="fc-event-body">
            {session.locationType === 'in_person' && (
              <div className="fc-event-row">
                <Users size={12} />
                <span>{session.locationDetail}</span>
              </div>
            )}
            {/* We already show the time in the header */}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * (NEW) Popover for Quick Actions on Calendar Events
 */
const EventActionPopover = React.forwardRef<
  HTMLDivElement,
  {
    target: HTMLElement | null
    session: ClassSession | null
    onClose: () => void
    onSetAttendance: (status: AttendanceStatus) => void
    onEdit: () => void
    isPending: boolean
  }
>(
  (
    { target, session, onClose, onSetAttendance, onEdit, isPending },
    ref
  ) => {
    const [position, setPosition] = useState({ top: 0, left: 0 })

    useEffect(() => {
      if (target) {
        const rect = target.getBoundingClientRect()
        const popoverWidth = 200 // Estimated width of popover
        let left = rect.left + window.scrollX
        // If it overflows the right edge, move it left
        if (left + popoverWidth > window.innerWidth) {
          left = rect.right + window.scrollX - popoverWidth
        }
        setPosition({
          top: rect.bottom + window.scrollY + 5,
          left: left,
        })
      }
    }, [target])

    if (!target || !session) return null

    return (
      <div
        ref={ref}
        className="fixed z-50 w-52 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-2 shadow-[var(--shadow-3)]"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">
            {session.student?.contact?.fullName}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <p className="mb-1 text-xs font-medium uppercase text-[var(--text-tertiary)]">
            Set Status
          </p>
          {ATTENDANCE_STATUSES.map((status) => (
            <Button
              key={status}
              variant={session.attendance === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onSetAttendance(status)}
              disabled={isPending}
              className="w-full justify-start capitalize"
            >
              {isPending && session.attendance === status ? (
                <Loader2 size={14} className="mr-2 animate-spin" />
              ) : (
                <CheckCircle
                  size={14}
                  className={clsx(
                    'mr-2',
                    session.attendance === status
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
              )}
              {status}
            </Button>
          ))}
          <div className="my-1 h-px bg-[var(--border-subtle)]" />
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={isPending}
            className="w-full justify-start"
          >
            <Edit size={14} className="mr-2" />
            Edit Full Session...
          </Button>
        </div>
      </div>
    )
  }
)
EventActionPopover.displayName = 'EventActionPopover'