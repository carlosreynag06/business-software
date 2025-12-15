'use client'

import * as React from 'react'
import Link from 'next/link'
import { Wallet, CalendarDays, Clock, MapPin, StickyNote } from 'lucide-react'
import { format } from 'date-fns'
import type { WeekItem } from '@/lib/types'

/* -----------------------
   Reusable UI Components
------------------------*/

const KpiCard = ({
  title,
  value,
  Icon,
  link,
  color,
}: {
  title: string
  value: string | number
  Icon: React.ElementType
  link?: string
  color: 'green' | 'blue' | 'amber' | 'violet'
}) => {
  const colorStyles = {
    green: 'bg-[var(--success)] text-white',
    blue: 'bg-[var(--info)] text-white',
    amber: 'bg-[var(--warning)] text-white',
    violet: 'bg-[var(--primary)] text-white',
  }

  const selectedColor = colorStyles[color] || colorStyles.violet

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-[var(--radius-lg)]',
        selectedColor,
        'shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)] focus-within:shadow-[var(--shadow-2)]',
      ].join(' ')}
    >
      <div className="relative p-5">
        <div className="flex h-[72px] flex-col justify-between">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-white/85">{title}</p>
            <div className="rounded-full bg-white/15 p-2">
              <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
            </div>
          </div>
          <p className="text-[var(--fs-h2)] font-bold text-white">
            {typeof value === 'number'
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
              : value}
          </p>
        </div>
      </div>
      {link && (
        <Link
          href={link}
          className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/10"
          aria-label={`View details for ${title}`}
        />
      )}
    </div>
  )
}

const Card = ({
  children,
  title,
  className,
}: {
  children: React.ReactNode
  title: string
  className?: string
}) => (
  <div
    className={[
      'relative overflow-hidden rounded-[var(--radius-lg)]',
      'bg-[var(--bg-surface)] shadow-[var(--shadow-1)]',
      className ?? '',
    ].join(' ')}
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgba(255,255,255,0.08),transparent)]" />
    <h3 className="mb-4 px-6 pt-6 text-[var(--fs-h4)] font-semibold leading-none text-[var(--text-primary)]">
      {title}
    </h3>
    <div className="relative">{children}</div>
  </div>
)

const LinkCard = ({
  title,
  Icon,
  link,
  subtitle,
}: {
  title: string
  Icon: React.ElementType
  link: string
  subtitle?: string
}) => (
  <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-1)] transition-shadow hover:shadow-[var(--shadow-2)]">
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%)]" />
    <h3 className="mb-4 px-6 pt-6 text-[var(--fs-h4)] font-semibold leading-none text-[var(--text-primary)]">
      {title}
    </h3>
    <div className="px-6 pb-6">
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
        <span className="text-sm">{subtitle ?? 'Open'}</span>
      </div>
    </div>
    <Link
      href={link}
      className="absolute inset-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
      aria-label={`Open ${title}`}
    />
  </div>
)

/* -------------
    Props
--------------*/
type Props = {
  todaysAgendaCount: number
  weekItems: WeekItem[]
  billsDueToday: number
  overdueBills: number
}

/* ----------------------------
    Main Client-Side Component
-----------------------------*/
export default function DashboardClient({
  todaysAgendaCount,
  weekItems,
  billsDueToday,
  overdueBills,
}: Props) {
  const [greeting, setGreeting] = React.useState('Hello')
  // Local state for search (optional, typically managed globally but kept local for isolated dashboard logic)
  const [searchQuery] = React.useState('')

  React.useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today)
      day.setDate(today.getDate() + i)
      return day
    })
  }, [today])

  const filteredWeekItems = React.useMemo(() => {
    const items = Array.isArray(weekItems) ? weekItems : []
    if (!searchQuery) return items
    const q = String(searchQuery).toLowerCase()
    return items.filter((it) => it.title?.toLowerCase().includes(q))
  }, [weekItems, searchQuery])

  const isoDateString = (d: Date) => format(d, 'yyyy-MM-dd')

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6 md:py-8 lg:space-y-8">
      {/* Greeting */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[var(--fs-h1)] font-bold tracking-tight">{greeting}, Carlos</h1>
          <p className="text-[var(--text-secondary)]">Your personal overview.</p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <KpiCard
          title="Today's Agenda"
          value={`${todaysAgendaCount} Events`}
          Icon={CalendarDays}
          link="/agenda"
          color="blue"
        />
        <KpiCard
          title="Bills Due Today"
          value={`${billsDueToday} Due`}
          Icon={Wallet}
          link="/budget"
          color="green"
        />
        <KpiCard
          title="Overdue Bills"
          value={`${overdueBills} Overdue`}
          Icon={Wallet}
          link="/budget"
          color="amber"
        />
      </div>

      {/* CALENDAR ROW — FULL WIDTH */}
      <Card title="This Week at a Glance" className="w-full">
        <div className="px-3 pb-6 md:px-4">
          {/* 7 equal columns; tightened gaps; no horizontal scroll */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 [&>*]:min-w-0">
            {weekDays.map((day) => {
              const dayISO = isoDateString(day)
              const dayItems = filteredWeekItems.filter((e) => e.dateISO === dayISO)
              const isToday = day.toDateString() === today.toDateString()

              return (
                <div
                  key={day.toISOString()}
                  tabIndex={0}
                  className={[
                    'group relative flex min-w-0 flex-col rounded-[calc(var(--radius-lg)-6px)]',
                    'bg-[var(--bg-muted)]', // Use light gray bg for day columns
                    'shadow-[var(--shadow-1)] transition-shadow',
                    isToday ? 'ring-1 ring-[var(--primary)] shadow-[var(--shadow-2)]' : '',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
                    'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_30%)] before:content-[""]',
                  ].join(' ')}
                >
                  {/* Day header: weekday + date */}
                  <div className="flex items-center gap-2 px-3 pt-2">
                    <span
                      className={[
                        'inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                        'truncate',
                        isToday
                          ? 'bg-[var(--primary-050)] text-[var(--text-primary)] shadow-[var(--shadow-1)]'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
                      ].join(' ')}
                      title={`${day.toLocaleDateString('en-US', { weekday: 'short' })} ${day.getDate()}`}
                    >
                      {day.toLocaleDateString('en-US', { weekday: 'short' })} {day.getDate()}
                    </span>
                  </div>

                  {/* Items list — readable chips; vertical scroll if overflow */}
                  <div className="relative mt-2 flex-1 space-y-2 px-3 pb-3 max-h-72 overflow-hidden group-focus-within:overflow-y-auto">
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.03))]" />

                    {dayItems.length > 0 ? (
                      dayItems.map((item) => {
                        const isBudget = item.source === 'budget'
                        // Strategic colors for items (Vibrant)
                        const chipBg = isBudget
                          ? 'bg-[var(--warning)]'
                          : item.source === 'calendar'
                          ? 'bg-[var(--info)]'
                          : 'bg-[var(--bg-surface)]'
                        const chipText =
                          isBudget || item.source === 'calendar'
                            ? 'text-white'
                            : 'text-[var(--text-primary)]'
                        const iconColor =
                          isBudget || item.source === 'calendar'
                            ? 'text-white/90'
                            : 'text-[var(--text-secondary)]'

                        // Items inside day columns are borderless
                        const borderStyle = 'border-transparent'

                        return (
                          <div
                            key={item.id}
                            className={[
                              'relative rounded-md',
                              borderStyle,
                              chipBg,
                              'shadow-[var(--shadow-1)] transition-all hover:shadow-[var(--shadow-2)] focus-within:shadow-[var(--shadow-2)]',
                              'px-3 py-3',
                            ].join(' ')}
                          >
                            {/* Title — bold, wraps to 2 lines */}
                            <p className={`line-clamp-2 min-h-[1.5rem] text-sm font-semibold leading-5 ${chipText}`}>
                              {item.title}
                            </p>

                            {/* Meta row: time + location (wrap gracefully) */}
                            {(item.startTime || item.endTime || item.location) && (
                              <div
                                className={`mt-1 flex flex-wrap items-start gap-x-3 gap-y-1 text-[12px] leading-4 ${chipText} opacity-90`}
                              >
                                {(item.startTime || item.endTime) && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock size={12} className={`shrink-0 ${iconColor}`} />
                                    <span className="whitespace-pre-wrap">
                                      {item.startTime}
                                      {item.endTime ? ` - ${item.endTime}` : ''}
                                    </span>
                                  </div>
                                )}
                                {item.location && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={12} className={`shrink-0 ${iconColor}`} />
                                    <span className="truncate">{item.location}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Budget amount */}
                            {isBudget && item.amount != null && (
                              <p className={`mt-1 text-[12px] leading-4 ${chipText} opacity-90`}>
                                Amount:{' '}
                                {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(item.amount)}
                              </p>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div
                        className={[
                          'rounded-md',
                          'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]',
                          'px-2.5 py-6 text-center text-xs text-[var(--text-tertiary)]',
                        ].join(' ')}
                      >
                        No items
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </main>
  )
}
