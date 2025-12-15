'use client'

import React from 'react'
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from './actions'
import ProjectsTable, {
  type ProjectType,
  formatDOP,
  formatDate,
  labelType,
} from '@/components/projects/ProjectsTable'
import AddProject, {
  type ProjectFormState,
  Modal,
  Field,
} from '@/components/projects/AddProject'
import clsx from 'clsx' // Import clsx

type ProjectsBootstrap = { projects?: Project[] }

// MODIFIED: Define the input base class
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'


export default function ProjectClient({
  initialData,
}: {
  initialData?: ProjectsBootstrap
}) {
  // Data
  const [projects, setProjects] = React.useState<Project[]>(
    initialData?.projects ?? []
  )

  // Filters
  const [q, setQ] = React.useState('')
  const [ptype, setPtype] = React.useState<ProjectType | 'all'>('all')

  // UI
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  // Modals
  const [projectModal, setProjectModal] = React.useState<{
    open: boolean
    mode: 'create' | 'edit'
    data?: Project | null
  }>({ open: false, mode: 'create', data: null })

  const [drawer, setDrawer] = React.useState<{
    open: boolean
    project?: Project | null
  }>({ open: false, project: null })

  // REMOVED: Client-side bootstrap useEffect

  // Derived list
  const visible = React.useMemo(() => {
    return projects.filter((p) => {
      if (ptype !== 'all' && p.type !== ptype) return false
      if (q) {
        const t =
          `${p.name} ${p.clientName} ${(p as any).description ?? ''}`.toLowerCase()
        if (!t.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [projects, ptype, q])

  // KPIs (Budget total & Pending balance) — computed from visible rows
  // MODIFIED: This logic is now correct, as actions.ts provides data in pesos.
  const { totalBudget, totalPending } = React.useMemo(() => {
    const budget = visible.reduce((s, p) => s + Number(p.budgetDop || 0), 0)
    const paid = visible.reduce(
      (s, p) => s + Number((p as any).amountPaid ?? 0),
      0
    )
    const pending = Math.max(0, budget - paid)
    return { totalBudget: budget, totalPending: pending }
  }, [visible])

  // CRUD helpers
  async function onCreateProject(form: ProjectFormState) {
    setLoading(true)

    try {
      const created = await createProject({
        // Save description to both name and description for UI parity
        name: form.description?.trim() || form.name.trim(),
        description: form.description?.trim() || form.name.trim(),
        // MODIFIED: Pass clientName and contactId to action
        clientName: form.clientName,
        type: form.type,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budgetDop: Number((form as any).budgetDopPesos || 0), // Use new form state key
      })
      setProjects((prev) => [created, ...prev])
      setToast('Project created.')
    } catch (e) {
      console.error(e)
      setToast('Could not create project.')
    } finally {
      setLoading(false)
    }
  }

  async function onUpdateProject(id: string, form: ProjectFormState) {
    setLoading(true)

    try {
      const updated = await updateProject(id, {
        name: form.description?.trim() || form.name.trim(),
        description: form.description?.trim() || form.name.trim(),
        // MODIFIED: Pass clientName and contactId to action
        clientName: form.clientName,
        type: form.type,
        startDate: form.startDate,
        dueDate: form.dueDate,
        budgetDop: Number((form as any).budgetDopPesos || 0), // Use new form state key
      })
      if (updated) {
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
        setToast('Project updated.')
      }
    } catch (e) {
      console.error(e)
      setToast('Could not update project.')
    } finally {
      setLoading(false)
    }
  }

  async function onDeleteProject(id: string) {
    if (!confirm('Delete this project?')) return
    setLoading(true)
    try {
      await deleteProject(id)
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setToast('Project deleted.')
      if (drawer.open && drawer.project?.id === id) {
        setDrawer({ open: false, project: null })
      }
    } catch (e) {
      console.error(e)
      setToast('Could not delete project.')
    } finally {
      setLoading(false)
    }
  }

  function openDrawer(p: Project) {
    setDrawer({ open: true, project: p })
  }

  // Render
  return (
    <div className="space-y-4">
      <Toolbar
        q={q}
        onQ={setQ}
        ptype={ptype}
        onPtype={setPtype}
        onNew={() => setProjectModal({ open: true, mode: 'create', data: null })}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* MODIFIED: This is correct, formatDOP expects pesos */}
        <KpiCard label="Budget Total" value={formatDOP(totalBudget)} />
        <KpiCard label="Pending Balance" value={formatDOP(totalPending)} />
      </div>

      {loading && (
        <div className="text-sm text-[var(--text-secondary,#6B7280)]">
          Loading…
        </div>
      )}

      {/* NOTE: The border on the table is inside the ProjectsTable component */}
      <ProjectsTable
        items={visible}
        onEdit={(p) => setProjectModal({ open: true, mode: 'edit', data: p })}
        onDelete={onDeleteProject}
        onOpen={(p) => openDrawer(p)}
        onBump={() => {}} // placeholder; table expects the prop
      />

      {/* Drawer: Project details */}
      <SideDrawer
        open={drawer.open}
        onClose={() => setDrawer({ open: false, project: null })}
      >
        {drawer.project && (
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">{drawer.project.name}</h3>
            <div className="text-sm text-[var(--text-secondary,#6B7280)]">
              <span className="mr-3">
                Client:{' '}
                <b className="text-[var(--text-primary,#111827)]">
                  {drawer.project.clientName}
                </b>
              </span>
              <span className="mr-3">
                Type: {labelType(drawer.project.type)}
              </span>
              <span>Budget: {formatDOP(drawer.project.budgetDop)}</span>
            </div>
          </div>
        )}
      </SideDrawer>

      {/* Project Modal */}
      {projectModal.open && (
        <AddProject
          mode={projectModal.mode}
          initial={projectModal.data || undefined}
          onClose={() =>
            setProjectModal({ open: false, mode: 'create', data: null })
          }
          onSubmit={async (form) => {
            if (projectModal.mode === 'create') await onCreateProject(form)
            else await onUpdateProject(projectModal.data!.id, form)
            setProjectModal({ open: false, mode: 'create', data: null })
          }}
        />
      )}

      {/* Toast - MODIFIED: Removed border, added shadow */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-[var(--shadow-3)] bg-[var(--surface-elev-1)] text-sm"
          onAnimationEnd={() => setTimeout(() => setToast(null), 1500)}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

/* ============================== Toolbar ============================== */
function Toolbar(props: {
  q: string
  onQ: (v: string) => void
  ptype: ProjectType | 'all'
  onPtype: (v: ProjectType | 'all') => void
  onNew: () => void
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 gap-2">
        {/* MODIFIED: Using inputBaseClass */}
        <input
          value={props.q}
          onChange={(e) => props.onQ(e.target.value)}
          placeholder="Search projects…"
          className={clsx(inputBaseClass, 'flex-1 py-2')} // Use py-2 for h-10 equivalent
        />
        {/* MODIFIED: Using inputBaseClass */}
        <select
          value={props.ptype}
          onChange={(e) => props.onPtype(e.target.value as any)}
          className={clsx(inputBaseClass, 'py-2')} // Use py-2 for h-10 equivalent
        >
          <option value="all">All types</option>
          <option value="website">Website</option>
          <option value="software">Software</option>
        </select>
      </div>
      <div className="flex gap-2">
        {/* MODIFIED: Using new button style from globals */}
        <button
          className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white shadow-[var(--shadow-1)] hover:bg-[var(--primary-600)]"
          onClick={props.onNew}
        >
          Add Project
        </button>
      </div>
    </div>
  )
}

/* ============================ Primitive UI =========================== */
function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    // MODIFIED: Removed border, added shadow
    <div className="rounded-xl bg-[var(--surface-elev-1)] p-3 shadow-[var(--shadow-1)]">
      <div className="text-xs text-[var(--text-secondary,#6B7280)]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  )
}

function SideDrawer(
  props: React.PropsWithChildren<{ open: boolean; onClose: () => void }>
) {
  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={props.onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl">
        <div className="p-3 border-b border-[color:var(--ui-200,#E5E7EB)] flex items-center justify-between">
          <div className="font-medium">Project Details</div>
          <button
            className="px-3 py-1 rounded-lg border border-[color:var(--ui-300,#D1D5DB)]"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-52px)]">
          {props.children}
        </div>
      </div>
    </div>
  )
}