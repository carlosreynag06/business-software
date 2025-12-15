// app/(app)/analytics/AnalyticsClient.tsx
'use client'

import React, { useState, useMemo, useEffect, useTransition, useRef } from 'react' // Added useRef
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import type {
  RevenueData,
  ChannelData,
  PipelineStage,
  ServiceType,
  MarketingChannel,
} from '@/lib/types'
// (Server action imports were correctly removed in the previous version)
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Filter,
  Download,
  DollarSign,
  TrendingUp,
  Users,
  Briefcase,
  GraduationCap,
  WalletCards,
  Megaphone,
  BookOpen,
  Search as SearchIcon, // Renamed to avoid conflict
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types & Constants
|--------------------------------------------------------------------------
*/

type Period = 'mtd' | '30d' | 'quarter'

// From CrmPipelineClient.tsx (based on Design Spec)
const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  website: 'Website',
  software: 'Software',
  english_class: 'English Class',
  spanish_class: 'Spanish Class',
  visa: 'Visa Help',
  social_media: 'Social Media',
}
const ALL_SERVICES = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]

// From CrmPipelineClient.tsx (based on Design Spec)
const SERVICE_INFO: Record<ServiceType, { icon: React.ElementType }> = {
  website: { icon: Briefcase },
  software: { icon: SearchIcon },
  english_class: { icon: GraduationCap },
  spanish_class: { icon: BookOpen },
  visa: { icon: WalletCards },
  social_media: { icon: Megaphone },
}

// From MarketingClient.tsx (based on Design Spec)
const MARKETING_CHANNEL_LABELS: Record<MarketingChannel, string> = {
  organic: 'Organic',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google_ads: 'Google Ads',
  radio: 'Radio/TV',
  tv: 'Radio/TV',
  referral: 'Referral',
  other: 'Other',
}
const ALL_CHANNELS: MarketingChannel[] = [
  'organic',
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'google_ads',
  'radio',
  'tv',
  'referral',
  'other',
]

// Colors for the Pie Chart, based on the design system palette
const PIE_COLORS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--success)',
  'var(--warning)',
  'var(--info)',
  'var(--danger)', // You can add more from the palette if needed
]

// MODIFIED: Re-usable input class, removed border, uses shadow
const inputBaseClass =
  'block w-full appearance-none rounded-[var(--radius-sm)] bg-[var(--surface-elev-1)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-opacity-75'

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

// Format as RD$ per the design spec
const formatCurrencyRD = (value: number | undefined) => {
  if (value === undefined) value = 0
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const value = payload[0].value
    return (
      // MODIFIED: Removed border
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] px-3 py-2 shadow-[var(--shadow-2)]">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label || data.name}</p>
        <p className="text-sm text-[var(--text-secondary)]">
          {data.revenue ? formatCurrencyRD(value) : value}
        </p>
      </div>
    )
  }
  return null
}

/*
|--------------------------------------------------------------------------
| Main Client Component
|--------------------------------------------------------------------------
*/
interface AnalyticsClientProps {
  initialRevenue: RevenueData[]
  initialPipeline: PipelineStage[]
  initialChannels: ChannelData[]
  initialRevenueOverTime: { name: string; revenue: number }[]
  initialLeadsByService: { name: string; value: number }[]
}

export default function AnalyticsClient({
  initialRevenue,
  initialPipeline,
  initialChannels,
  initialRevenueOverTime,
  initialLeadsByService,
}: AnalyticsClientProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { notify } = useToast()
  const isInitialMount = useRef(true); // Ref to prevent effect on mount

  // --- Filter State ---
  const [period, setPeriod] = useState<Period>('mtd')
  const [filterChannel, setFilterChannel] = useState<'all' | MarketingChannel>('all')
  const [filterService, setFilterService] = useState<'all' | ServiceType>('all')

  // --- Data State ---
  // In a real app, these would be re-fetched on filter change
  const [revenueData, setRevenueData] = useState(initialRevenue)
  const [pipelineData, setPipelineData] = useState(initialPipeline)
  const [channelData, setChannelData] = useState(initialChannels)
  const [revenueOverTimeData, setRevenueOverTimeData] = useState(
    initialRevenueOverTime,
  )
  const [leadsByServiceData, setLeadsByServiceData] = useState(
    initialLeadsByService,
  )
  
  // Sync server data (for router.refresh())
  useEffect(() => setRevenueData(initialRevenue), [initialRevenue])
  useEffect(() => setPipelineData(initialPipeline), [initialPipeline])
  useEffect(() => setChannelData(initialChannels), [initialChannels])
  useEffect(() => setRevenueOverTimeData(initialRevenueOverTime), [initialRevenueOverTime])
  useEffect(() => setLeadsByServiceData(initialLeadsByService), [initialLeadsByService])

  // MODIFIED: Auto-filter logic
  useEffect(() => {
    // Don't run on the initial render
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    startTransition(() => {
      // In a real app, you'd call a server action here to refetch data
      // For this mock, we'll just simulate it with notifications
      notify({
        title: 'Filters Applying...',
        description: `Loading new analytics data.`,
        variant: 'info',
      })
      
      // Simulate network delay
      setTimeout(() => {
        notify({
          title: 'Analytics Updated',
          description: 'Data has been filtered (simulated).',
          variant: 'success',
        })
      }, 800);
    });
  }, [period, filterChannel, filterService, notify]); // Dependencies trigger this effect

  return (
    <div className="flex h-full flex-col gap-5">
      {/* 1. Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
            Analytics
          </h1>
          <p className="mt-1 text-base text-[var(--text-secondary)]">
            Deep dive into your business performance
          </p>
        </div>
        {/* MODIFIED: Removed Export Button */}
      </div>

      {/* 2. Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodToggle selected={period} onSelect={setPeriod} />
        <div className="relative flex-1">
          <select
            value={filterChannel}
            onChange={(e) =>
              setFilterChannel(e.target.value as 'all' | MarketingChannel)
            }
            className={clsx(inputBaseClass, 'w-full min-w-[180px]')}
          >
            <option value="all">All Channels</option>
            {ALL_CHANNELS.map((c) => (
              <option key={c} value={c} className="capitalize">
                {MARKETING_CHANNEL_LABELS[c] || c}
              </option>
            ))}
          </select>
        </div>
        <div className="relative flex-1">
          <select
            value={filterService}
            onChange={(e) =>
              setFilterService(e.target.value as 'all' | ServiceType)
            }
            className={clsx(inputBaseClass, 'w-full min-w-[180px]')}
          >
            <option value="all">All Services</option>
            {ALL_SERVICES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {SERVICE_TYPE_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>
        {/* MODIFIED: Removed Apply Filters Button */}
      </div>

      {/* 3. Chart & Table Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Over Time (Line) */}
        <RevenueOverTimeChart data={revenueOverTimeData} />

        {/* Leads by Service (Pie) */}
        <LeadsByServiceChart data={leadsByServiceData} />
        
        {/* Revenue by Service (Bar) - Re-used from Dashboard */}
        <RevenueByServiceChart data={revenueData} />

        {/* Pipeline Funnel - Re-used from Dashboard */}
        <PipelineFunnel stages={pipelineData} />
      </div>
      
      {/* 4. Full-Width Table */}
      <div className="grid grid-cols-1 gap-6">
        {/* Channel Performance Table - Re-used from Dashboard */}
        <ChannelPerformanceTable data={channelData} />
      </div>
    </div>
  )
}

/*
|--------------------------------------------------------------------------
| Sub-Components
|--------------------------------------------------------------------------
*/

// Copied from DashboardClient.tsx
function PeriodToggle({
  selected,
  onSelect,
}: {
  selected: Period
  onSelect: (p: Period) => void
}) {
  const periods: { key: Period; label: string }[] = [
    { key: 'mtd', label: 'MTD' },
    { key: '30d', label: '30 Days' },
    { key: 'quarter', label: 'Quarter' },
  ]
  return (
    // MODIFIED: Removed border
    <div className="flex items-center rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-1 shadow-[var(--shadow-1)]">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => onSelect(p.key)}
          className={clsx(
            'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition-colors',
            selected === p.key
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

// Copied from DashboardClient.tsx
function PipelineFunnel({ stages }: { stages: PipelineStage[] }) {
  const stageColors = [
    'text-[#7B61FF]', // Lead
    'text-[var(--secondary)]', // Discovery
    'text-[var(--primary)]', // Delivery
    'text-[var(--success)]', // Paid
  ]
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Pipeline Funnel
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {stages.map((stage, i) => (
          <div key={stage.name} className="text-center">
            <div
              className={clsx(
                'mb-1 font-sans text-xs font-bold uppercase tracking-wider',
                stageColors[i % 4],
              )}
            >
              {stage.name}
            </div>
            <div className="mb-2 font-sans text-3xl font-bold text-[var(--text-primary)]">
              {stage.count}
            </div>
            {i < stages.length - 1 && (
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                → {stage.conversionRate}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Copied from DashboardClient.tsx (and enhanced with icons/labels)
function RevenueByServiceChart({ data }: { data: RevenueData[] }) {
  const total = data.reduce((acc, s) => acc + s.revenue, 0)
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
        Revenue by Service
      </h3>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Total: {formatCurrencyRD(total)}
      </p>
      {/* This is the container that needs an explicit min-height
        to fix the recharts rendering error.
      */}
      <div className="h-[300px] min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis type="number" tickFormatter={(value) => formatCurrencyRD(value)} />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={100} 
              tickFormatter={(value) => SERVICE_TYPE_LABELS[value as ServiceType] || value}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-muted)' }} />
            <Bar dataKey="revenue" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// Copied from DashboardClient.tsx
function ChannelPerformanceTable({ data }: { data: ChannelData[] }) {
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)] lg:col-span-2">
      <h3 className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold text-[var(--text-primary)]">
        Channel Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          {/* HYDRATION ERROR FIX: Removed whitespace between thead and tr */}
          <thead className="bg-[var(--bg-muted)]"><tr>{/* Use bg-muted */}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                Channel
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                Spend
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                Leads
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                Closes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                Revenue
              </th>
            </tr></thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.map((channel) => (
              <tr key={channel.name}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  {channel.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {formatCurrencyRD(channel.spend)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {channel.leads}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {channel.closes}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-[var(--success)]">
                  {formatCurrencyRD(channel.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// New component for this page
function RevenueOverTimeChart({ data }: { data: { name: string, revenue: number }[] }) {
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Revenue Over Time
      </h3>
      {/* This is the container that needs an explicit min-height
        to fix the recharts rendering error.
      */}
      <div className="h-[300px] min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis dataKey="name" />
            <YAxis tickFormatter={(value) => formatCurrencyRD(value)} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--primary)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// New component for this page
function LeadsByServiceChart({ data }: { data: { name: string, value: number }[] }) {
  return (
    // MODIFIED: Removed border
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Leads by Service
      </h3>
      {/* This is the container that needs an explicit min-height
        to fix the recharts rendering error.
      */}
      <div className="h-[300px] min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${SERVICE_TYPE_LABELS[name as ServiceType]} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}