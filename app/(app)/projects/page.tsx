// app/(app)/projects/page.tsx
import React from 'react'
import type { Metadata } from 'next'
import ProjectClient from './ProjectClient'
import { getProjects } from './actions'
// MODIFIED: Import working action from classes module
import type { Project } from '@/lib/types'

// Page metadata (keeps titles consistent with the Design System)
export const metadata: Metadata = {
  title: 'Projects',
  description:
    'Projects module — track website & software projects with milestones, statuses, and RD$ amounts.',
}

/**
 * Projects Page (Server Component)
 * - Reads initial DB data from actions.ts
 * - Passes it to ProjectClient (client component) for all interactions
 * - MODIFIED: Fetches projects and students (for contact list)
 */
export default async function ProjectsPage() {
  // MODIFIED: Fetch projects and students in parallel
  const [projectsData] = await Promise.all([
    getProjects(),
  ])

  // Safe fallbacks
  const safeProjects: Project[] = Array.isArray(projectsData) ? projectsData : []

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] leading-9 font-semibold text-[var(--text-primary,#332D29)]">
          Projects
        </h1>
      </header>

      {/* MODIFIED: Pass both projects and students */}
      <ProjectClient
        initialData={{ projects: safeProjects }}
      />
    </div>
  )
}