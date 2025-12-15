// app/(app)/projects/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ProjectType } from '@/lib/types'

/* =========================================================
  Local Types (Contract with Client Components)
  ========================================================= */

export interface Project {
  id: string
  name: string
  description: string | null
  clientName: string // populated from contacts/name field stored on project
  type: ProjectType // 'website' | 'software'
  startDate: string | null // YYYY-MM-DD
  dueDate: string | null // YYYY-MM-DD
  budgetDop: number // RD$ (DOP) in pesos for the client
  amountPaid: number // RD$ (DOP) in pesos for the client
  progress: number // 0..100 (not in DB; mock)
  tags: string[] // (not in DB; mock)
  notes?: string | null // (not in DB; mock)
}

export interface Milestone {
  id: string
  projectId: string
  title: string
  dueDate: string // YYYY-MM-DD
  progress: number // 0..100
}

/* =========================================================
  Query Functions
  ========================================================= */

export async function getProjects(): Promise<Project[]> {
  const supabase = await createSupabaseServerClient()

  // Fetch projects + related payments, then sum amount_dop_cents per project
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      description,
      client_name,
      type,
      start_date,
      due_date,
      budget_dop_cents,
      payments ( amount_dop_cents )
    `
    )
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching projects:', error.message)
    return []
  }

  const projects: Project[] = data.map((p: any) => {
    const amountPaidInCents = (p.payments ?? []).reduce(
      (sum: number, payment: any) => sum + (payment.amount_dop_cents || 0),
      0
    )

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      clientName: p.client_name || 'N/A',
      type: p.type,
      startDate: p.start_date,
      dueDate: p.due_date,
      budgetDop: (p.budget_dop_cents || 0) / 100, // cents -> pesos
      amountPaid: amountPaidInCents / 100, // cents -> pesos
      // Client-only fields
      progress: 0,
      tags: [],
      notes: null,
    }
  })

  return projects
}

export async function getProjectById(id: string): Promise<Project | null> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select(
      `
      id,
      name,
      description,
      client_name,
      type,
      start_date,
      due_date,
      budget_dop_cents,
      payments ( amount_dop_cents )
    `
    )
    .eq('id', id)
    .single()

  if (error || !data) {
    console.error('Error fetching project by id:', error?.message)
    return null
  }

  const p: any = data
  const amountPaidInCents = (p.payments ?? []).reduce(
    (sum: number, payment: any) => sum + (payment.amount_dop_cents || 0),
    0
  )

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    clientName: p.client_name || 'N/A',
    type: p.type,
    startDate: p.start_date,
    dueDate: p.due_date,
    budgetDop: (p.budget_dop_cents || 0) / 100,
    amountPaid: amountPaidInCents / 100,
    progress: 0,
    tags: [],
    notes: null,
  }
}

export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('milestones')
    .select('id, project_id, title, due_date, progress')
    .eq('project_id', projectId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching milestones:', error.message)
    return []
  }

  return (data ?? []).map((m: any) => ({
    id: m.id,
    projectId: m.project_id,
    title: m.title,
    dueDate: m.due_date,
    progress: m.progress || 0,
  }))
}

/* =========================================================
  Mutations — Projects
  ========================================================= */

export type CreateProjectInput = {
  name: string
  description: string | null
  clientName: string
  type: ProjectType
  startDate: string | null
  dueDate: string | null
  budgetDop: number // pesos
}

export type UpdateProjectInput = Partial<CreateProjectInput>

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = await createSupabaseServerClient()

  const dbRow = {
    name: input.name,
    description: input.description,
    client_name: input.clientName || null,
    type: input.type,
    start_date: input.startDate || null,
    due_date: input.dueDate || null,
    budget_dop_cents: Math.round((input.budgetDop || 0) * 100),
  }

  const { data, error } = await supabase
    .from('projects')
    .insert(dbRow)
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error.message)
    throw error
  }

  revalidatePath('/projects')
  revalidatePath('/payments')

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    clientName: data.client_name || 'N/A',
    type: data.type,
    startDate: data.start_date,
    dueDate: data.due_date,
    budgetDop: (data.budget_dop_cents || 0) / 100,
    amountPaid: 0,
    progress: 0,
    tags: [],
    notes: null,
  }
}

export async function updateProject(
  id: string,
  patch: UpdateProjectInput
): Promise<Project | null> {
  const supabase = await createSupabaseServerClient()

  const dbPatch: Record<string, any> = {
    name: patch.name,
    description: patch.description,
    client_name: patch.clientName,
    type: patch.type,
    start_date: patch.startDate,
    due_date: patch.dueDate,
  }

  if (patch.budgetDop !== undefined) {
    dbPatch.budget_dop_cents = Math.round((patch.budgetDop || 0) * 100)
  }

  Object.keys(dbPatch).forEach((k) => dbPatch[k] === undefined && delete dbPatch[k])

  const { data, error } = await supabase
    .from('projects')
    .update(dbPatch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating project:', error.message)
    throw error
  }

  revalidatePath('/projects')
  revalidatePath('/payments')

  return getProjectById(data.id)
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    console.error('Error deleting project:', error.message)
    throw error
  }

  revalidatePath('/projects')
  revalidatePath('/payments')
  return { ok: true }
}

/* =========================================================
  Mutations — Milestones
  ========================================================= */

type CreateMilestoneInput = {
  title: string
  dueDate: string
  progress: number
}

type UpdateMilestoneInput = Partial<CreateMilestoneInput> & { id: string }

export async function addMilestone(
  projectId: string,
  input: CreateMilestoneInput
): Promise<Milestone> {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('milestones')
    .insert({
      project_id: projectId,
      title: input.title,
      due_date: input.dueDate,
      progress: input.progress || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding milestone:', error.message)
    throw error
  }

  revalidatePath('/projects')
  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    dueDate: data.due_date,
    progress: data.progress,
  }
}

export async function updateMilestone(
  input: UpdateMilestoneInput
): Promise<Milestone | null> {
  const supabase = await createSupabaseServerClient()

  const dbPatch: Record<string, any> = {
    title: input.title,
    due_date: input.dueDate,
    progress: input.progress,
  }
  Object.keys(dbPatch).forEach((k) => dbPatch[k] === undefined && delete dbPatch[k])

  const { data, error } = await supabase
    .from('milestones')
    .update(dbPatch)
    .eq('id', input.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating milestone:', error.message)
    throw error
  }

  revalidatePath('/projects')
  return {
    id: data.id,
    projectId: data.project_id,
    title: data.title,
    dueDate: data.due_date,
    progress: data.progress,
  }
}

export async function deleteMilestone(id: string): Promise<{ ok: boolean }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('milestones').delete().eq('id', id)

  if (error) {
    console.error('Error deleting milestone:', error.message)
    throw error
  }

  revalidatePath('/projects')
  return { ok: true }
}

/* =========================================================
  Convenience (bulk tweaks for demos/tests)
  ========================================================= */

export async function bumpProjectProgress(
  id: string,
  delta = 5
): Promise<Project | null> {
  console.warn('bumpProjectProgress is a mock function and does not affect the database.')
  return getProjectById(id)
}

export async function quickPlanWebsite(clientName: string): Promise<Project> {
  const project = await createProject({
    name: `Sitio Web – ${clientName}`,
    description: `Sitio Web – ${clientName}`,
    clientName: clientName,
    type: 'website',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40).toISOString().slice(0, 10),
    budgetDop: 150000,
  })

  try {
    await addMilestone(project.id, {
      title: 'Arquitectura & Wireframes',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
      progress: 0,
    })
    await addMilestone(project.id, {
      title: 'UI + Animaciones',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18).toISOString().slice(0, 10),
      progress: 0,
    })
    await addMilestone(project.id, {
      title: 'Integraciones & QA',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 32).toISOString().slice(0, 10),
      progress: 0,
    })
  } catch (e) {
    console.error('Could not create default milestones:', (e as Error).message)
  }

  return project
}
