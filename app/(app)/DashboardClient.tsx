// app/(app)/DashboardClient.tsx
'use client';

import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  Activity,
  BarChart3,
  BookUser,
  Briefcase,
  DollarSign,
  Filter,
  LayoutGrid,
  Network,
  WalletCards, // Corrected from 'Passport'
  School,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type {
  BusinessKpis,
  PipelineStage,
  RevenueData,
  ChannelData,
  ModuleHealth,
  ActivityItem,
} from '@/lib/types'; // We will define these types in lib/types.ts

// --- Types ---
type Period = 'mtd' | '30d' | 'quarter';

interface DashboardClientProps {
  initialKpis: BusinessKpis;
  initialPipeline: PipelineStage[];
  initialRevenue: RevenueData[];
  initialChannels: ChannelData[];
  initialHealth: ModuleHealth;
  initialActivities: ActivityItem[];
}

// --- Helpers ---
const formatCurrencyRD = (value: number | undefined) => {
  if (value === undefined) value = 0;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// --- Main Client Component ---
export default function DashboardClient({
  initialKpis,
  initialPipeline,
  initialRevenue,
  initialChannels,
  initialHealth,
  initialActivities,
}: DashboardClientProps) {
  const [period, setPeriod] = useState<Period>('mtd');

  // In a real app, changing the period would re-fetch data.
  // For this UI-only phase, we'll just show the initial mock data.
  const kpis = initialKpis;
  const pipeline = initialPipeline;
  const revenue = initialRevenue;
  const channels = initialChannels;
  const health = initialHealth;
  const activities = initialActivities;

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Header, Period Toggle, AI Insights */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-sans text-[var(--fs-h1)] font-bold text-[var(--text-primary)]">
            Business Health Dashboard
          </h1>
          <p className="text-[var(--fs-small)] text-[var(--text-secondary)]">
            At-a-glance performance for your business
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Insights Pill */}
          <button className="flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--surface-elev-2)]">
            <Sparkles size={16} className="text-[var(--primary)]" />
            <span>AI Insights</span>
          </button>
          {/* Period Toggle */}
          <PeriodToggle selected={period} onSelect={setPeriod} />
        </div>
      </div>

      {/* Row 2: KPI Ring Group */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Revenue (RD$)"
          value={formatCurrencyRD(kpis.revenue)}
          icon={DollarSign}
          color="success"
        />
        <KpiCard
          title="New Leads"
          value={kpis.leads.toString()}
          icon={Network}
          color="primary"
        />
        <KpiCard
          title="Closes"
          value={kpis.closes.toString()}
          icon={TrendingUp}
          color="secondary"
        />
        <KpiCard
          title="Class Attendance"
          value={`${kpis.attendance}%`}
          icon={School}
          color="info"
        />
      </div>

      {/* Row 3: Pipeline Funnel */}
      <PipelineFunnel stages={pipeline} />

      {/* Row 4: Revenue & Channel Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueByServiceChart data={revenue} />
        <ChannelPerformanceTable data={channels} />
      </div>

      {/* Row 5: Module Health & Activities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ModuleHealthCard
          title="Project Health"
          icon={Briefcase}
          stats={[
            { label: 'On Time', value: health.projects.onTime },
            { label: 'Blocked', value: health.projects.blocked },
          ]}
          color="primary"
        />
        <ModuleHealthCard
          title="Class Health"
          icon={School}
          stats={[
            { label: 'Active Students', value: health.classes.active },
            { label: 'Renewals Due', value: health.classes.renewals },
          ]}
          color="secondary"
        />
        <ModuleHealthCard
          title="Visa Caseload"
          icon={WalletCards} // Corrected
          stats={[
            { label: 'Active Cases', value: health.visa.active },
            { label: 'At Risk', value: health.visa.atRisk },
          ]}
          color="warning"
        />
      </div>

      {/* Bonus Row: Upcoming Activities Feed */}
      <UpcomingActivitiesFeed activities={activities} />
    </div>
  );
}

// --- Sub-Components ---

---

function PeriodToggle({
  selected,
  onSelect,
}: {
  selected: Period;
  onSelect: (p: Period) => void;
}) {
  const periods: { key: Period; label: string }[] = [
    { key: 'mtd', label: 'MTD' },
    { key: '30d', label: '30 Days' },
    { key: 'quarter', label: 'Quarter' },
  ];

  return (
    <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-1 shadow-[var(--shadow-1)]">
      {periods.map((p) => (
        <button
          key={p.key}
          onClick={() => onSelect(p.key)}
          className={clsx(
            'rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-semibold transition-colors',
            selected === p.key
              ? 'bg-[var(--primary)] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

---

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'danger';
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    success: 'text-[var(--success)]',
    info: 'text-[var(--info)]',
    warning: 'text-[var(--warning)]',
    danger: 'text-[var(--danger)]',
  };
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
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
  );
}

---

function PipelineFunnel({ stages }: { stages: PipelineStage[] }) {
  const stageColors = [
    'text-[#7B61FF]', // Lead
    'text-[var(--secondary)]', // Discovery
    'text-[var(--primary)]', // Delivery
    'text-[var(--success)]', // Paid
  ];

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Pipeline Funnel
      </h3>
      <div className="grid grid-cols-4 gap-4">
        {stages.map((stage, i) => (
          <div key={stage.name} className="text-center">
            <div
              className={clsx(
                'mb-1 font-sans text-xs font-bold uppercase tracking-wider',
                stageColors[i % 4]
              )}
            >
              {stage.name}
            </div>
            <div className="mb-2 font-sans text-3xl font-bold text-[var(--text-primary)]">
              {stage.count}
            </div>
            {i < stages.length - 1 && (
              <div className="text-sm font-medium text-[var(--text-secondary)]">
                &rarr; {stage.conversionRate}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

---

function RevenueByServiceChart({ data }: { data: RevenueData[] }) {
  // This is a mock chart render
  const total = data.reduce((acc, s) => acc + s.revenue, 0);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">
        Revenue by Service
      </h3>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Total: {formatCurrencyRD(total)}
      </p>
      <div className="space-y-3">
        {data.map((service) => (
          <div key={service.name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium text-[var(--text-secondary)]">
                {service.name}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrencyRD(service.revenue)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--bg-surface)]">
              <div
                className="h-2 rounded-full bg-[var(--primary)]"
                style={{ width: `${(service.revenue / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

---

function ChannelPerformanceTable({ data }: { data: ChannelData[] }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-1)]">
      <h3 className="border-b border-[var(--border-subtle)] p-5 text-lg font-semibold text-[var(--text-primary)]">
        Channel Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-subtle)]">
          <thead className="bg-[var(--bg-surface)]">
            <tr>
              {/* Per the spec: Channel, Ad Spend, Leads, CPL, Closes, CAC, Revenue, ROI, ROAS */}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {data.map((channel) => (
              <tr key={channel.name}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  {channel.name}
                </td>
                <td className="whitespace-nowCrap px-4 py-3 text-sm text-[var(--text-secondary)]">
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
  );
}

---

function ModuleHealthCard({
  title,
  icon: Icon,
  stats,
  color,
}: {
  title: string;
  icon: React.ElementType;
  stats: { label: string; value: string | number }[];
  color: 'primary' | 'secondary' | 'warning';
}) {
  const colorMap = {
    primary: 'text-[var(--primary)]',
    secondary: 'text-[var(--secondary)]',
    warning: 'text-[var(--warning)]',
  };
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <div className="mb-4 flex items-center gap-3">
        <Icon size={18} className={clsx('shrink-0', colorMap[color])} />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
      </div>
      <div className="flex justify-around gap-4 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-sans text-3xl font-bold text-[var(--text-primary)]">
              {stat.value}
            </div>
            <div className="text-xs font-medium uppercase text-[var(--text-secondary)]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

---

function UpcomingActivitiesFeed({ activities }: { activities: ActivityItem[] }) {
  const iconMap: Record<string, React.ElementType> = {
    call: BookUser,
    whatsapp: LayoutGrid, // Using a different icon for variety
    email: Briefcase,
    meeting: Calendar,
    note: Activity,
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] p-5 shadow-[var(--shadow-1)]">
      <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
        Upcoming Activities
      </h3>
      <div className="max-h-96 space-y-4 overflow-y-auto">
        {activities.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            No upcoming activities scheduled.
          </p>
        )}
        {activities.map((item) => {
          const Icon = iconMap[item.type] || Activity;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-surface)] text-[var(--text-secondary)]">
                <Icon size={18} />
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {item.summary}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {new Date(item.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' @ '}
                  {new Date(item.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}