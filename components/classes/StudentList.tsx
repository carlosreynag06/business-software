// components/classes/StudentList.tsx
'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import type {
  Contact,
  ClassStudent,
  PackageStatus,
  ClassStudentStatus, // ADDED
} from '@/lib/types'
import {
  Mail,
  MessageSquare,
  Info,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Main List Component
|--------------------------------------------------------------------------
*/
export default function StudentList({
  students,
  onEdit,
  onDelete,
  onViewDetails,
  isPending,
}: {
  students: ClassStudent[]
  onEdit: (student: ClassStudent) => void
  onDelete: (student: ClassStudent) => void
  onViewDetails: (student: ClassStudent) => void
  isPending: boolean
}) {
  return (
    <div className="h-full overflow-y-auto">
      <table className="min-w-full divide-y divide-[var(--border-subtle)]">
        <thead className="sticky top-0 bg-[var(--bg-muted)]">
          <tr>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Student
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Language
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Status {/* MODIFIED: Was Type */}
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Level
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-[var(--text-secondary)]">
              Active Package
            </th>
            <th className="relative px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-elev-1)]">
          {students.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-sm text-[var(--text-secondary)]"
              >
                No students match the current filters.
              </td>
            </tr>
          )}
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              isPending={isPending}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Student Row Sub-Component
|--------------------------------------------------------------------------
*/

// ADDED: Status badge for students
function StudentStatusBadge({ status }: { status: ClassStudentStatus }) {
  const statusColors: Record<ClassStudentStatus, string> = {
    active: 'bg-[var(--success)]/10 text-[var(--success)]',
    paused: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    inactive: 'bg-[var(--danger)]/10 text-[var(--danger)]',
  }
  return (
    <span
      className={clsx(
        'rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium capitalize',
        statusColors[status]
      )}
    >
      {status}
    </span>
  )
}

function StudentRow({
  student,
  onEdit,
  onDelete,
  onViewDetails,
  isPending,
}: {
  student: ClassStudent
  onEdit: (student: ClassStudent) => void
  onDelete: (student: ClassStudent) => void
  onViewDetails: (student: ClassStudent) => void
  isPending: boolean
}) {
  const activePackage = student.packages?.[0]
  const needsRenewal =
    activePackage &&
    activePackage.sessionsIncluded > 0 && // Avoid division by zero
    activePackage.sessionsConsumed / activePackage.sessionsIncluded >= 0.8

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[var(--bg-muted)]"
      onClick={() => onViewDetails(student)}
    >
      <td className="whitespace-nowrap px-5 py-4">
        <div className="font-medium text-[var(--text-primary)]">
          {student.contact.fullName}
        </div>
        <div className="text-sm text-[var(--text-secondary)]">
          {student.contact.email}
        </div>
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        <span className="capitalize">{student.language}</span>
      </td>
      {/* MODIFIED: Replaced student.groupType with StudentStatusBadge */}
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        <StudentStatusBadge status={student.status} />
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm text-[var(--text-secondary)]">
        {student.level}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-sm">
        {activePackage ? (
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-secondary)]">
              {`${activePackage.sessionsConsumed} / ${activePackage.sessionsIncluded} sessions`}
            </span>
            {needsRenewal && (
              <span className="rounded-[var(--radius-pill)] bg-[var(--warning)]/10 px-2 py-0.5 text-xs font-medium text-[var(--warning)]">
                Renewal Due
              </span>
            )}
          </div>
        ) : (
          <span className="text-[var(--text-tertiary)]">No Active Package</span>
        )}
      </td>
      <td className="whitespace-nowrap px-5 py-4 text-right text-sm">
        <RowActions
          onEdit={() => onEdit(student)}
          onDelete={() => onDelete(student)}
          onViewDetails={() => onViewDetails(student)}
          contact={student.contact}
          isPending={isPending}
        />
      </td>
    </tr>
  )
}

/*
|--------------------------------------------------------------------------
| Floating Menu for Row Actions
|--------------------------------------------------------------------------
*/
function RowActions({
  onEdit,
  onDelete,
  onViewDetails,
  contact,
  isPending,
}: {
  onEdit: () => void
  onDelete: () => void
  onViewDetails: () => void
  contact: Contact
  isPending: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAction = (action: () => void) => {
    setIsOpen(false)
    action()
  }

  // Get position of the button to align the menu
  const [menuPosition, setMenuPosition] = useState<{
    top: number
    right: number
  } | null>(null)

  const openMenu = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + window.scrollY + 4, // 4px below button
        right: window.innerWidth - rect.right - rect.width / 2, // Align right
      })
      setIsOpen(true)
    }
  }

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation() // Prevent row click
      }}
    >
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          isOpen ? setIsOpen(false) : openMenu()
        }}
        disabled={isPending}
        className="rounded-md p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
      >
        <MoreHorizontal size={18} />
      </button>

      {/* Portal for Menu */}
      {isOpen &&
        menuPosition &&
        createPortal(
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed z-10 w-48 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1.5 shadow-[var(--shadow-3)]"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <button
              onClick={() => handleAction(onViewDetails)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Info size={14} /> View Details
            </button>
            <a
              href={`mailto:${contact.email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              onClick={() => setIsOpen(false)}
            >
              <Mail size={14} /> Email
            </a>
            <a
              // Use phoneE164 for whatsapp link if available, fallback to phone
              href={`https://wa.me/${
                contact.phoneE164?.replace(/\D/g, '') ||
                contact.phone?.replace(/\D/g, '')
              }`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              onClick={() => setIsOpen(false)}
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
            <div className="my-1 h-px bg-[var(--border-subtle)]" />
            <button
              onClick={() => handleAction(onEdit)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={() => handleAction(onDelete)}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>,
          document.body
        )}
    </div>
  )
}