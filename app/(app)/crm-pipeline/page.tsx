// app/(app)/crm-pipeline/page.tsx
import * as React from 'react'
import { getLeads } from './actions' // MODIFIED: Import getLeads
import CrmPipelineClient from './CrmPipelineClient'

export default async function CrmPipelinePage() {
  // Fetch data on the server
  const initialData = await getLeads({}) // MODIFIED: Call getLeads with empty params

  // MODIFIED: Pass as initialRows
  return <CrmPipelineClient initialRows={initialData} />
}