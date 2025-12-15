'use client'

import React, { useState, useEffect } from 'react'
// Replaced next/link and next/navigation to resolve build errors in preview env
// import Link from 'next/link'
// import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  LayoutDashboard,
  Network,
  Briefcase,
  School,
  WalletCards,
  Coins,
  Megaphone,
  CreditCard,
  TrendingUp,
  BarChart3,
  Wand2,
  Sparkles,
  HandCoins,
  Building2,
  Wallet,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  HeartPulse,
  Calculator, // Icon for Business Simulation
  ShoppingCart, // Shopping icon for Personal section
} from 'lucide-react'

// --- Mock usePathname for preview environment ---
function usePathname() {
  const [pathname, setPathname] = useState('')
  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])
  return pathname
}

/* --- 1. Business: Primary Links --- */
const businessPrimary = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm-pipeline', label: 'CRM Pipeline', icon: Network },
  // Agenda removed (moved to Topbar)
  { href: '/projects', label: 'Projects', icon: Briefcase },
  // Inmigration Services moved to More section
  { href: '/crypto', label: 'Crypto', icon: Coins },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/real-estate', label: 'Real Estate', icon: Building2 },
  { href: '/business', label: 'Business Simulation', icon: Calculator }, // New Link Added Here
]

/* --- 2. Business: "More" Links (Collapsible) --- */
const businessMore = [
  { href: '/inmigration-services', label: 'Inmigration Services', icon: WalletCards }, // Moved Here
  { href: '/classes', label: 'Classes', icon: School },
  { href: '/loans', label: 'Loans', icon: HandCoins },
  { href: '/social-media', label: 'Social Media', icon: Megaphone },
  { href: '/marketing', label: 'Marketing', icon: TrendingUp },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/automations', label: 'Automations', icon: Wand2 },
  { href: '/ai-assistant', label: 'AI Assistant', icon: Sparkles },
]

/* --- 3. Personal Links --- */
const personalLinks = [
  { href: '/personal-dashboard', label: 'Personal Dashboard', icon: LayoutDashboard },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/shopping', label: 'Shopping', icon: ShoppingCart },
  { href: '/health', label: 'Health', icon: HeartPulse },
]

export function Sidebar() {
  const pathname = usePathname()

  // --- State ---
  const [isBusinessOpen, setIsBusinessOpen] = useState(true)
  const [isPersonalOpen, setIsPersonalOpen] = useState(true)

  // "More" Sub-category logic
  const isMoreActive = businessMore.some((link) => pathname.startsWith(link.href))
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  // Auto-open "More" if a child is active
  useEffect(() => {
    if (isMoreActive) {
      setIsMoreOpen(true)
      setIsBusinessOpen(true) // Ensure parent is open too
    }
  }, [isMoreActive])

  return (
    <aside className="hidden h-screen w-64 flex-col border-r border-[var(--border-subtle)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] lg:flex">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-6">
        <a
          href="/"
          className="font-sans text-xl font-bold text-[var(--sidebar-text)] no-underline"
        >
          My Business Software
        </a>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-[var(--border)]">
        
        {/* --- BUSINESS SECTION --- */}
        <div className="mb-6">
          <SectionHeader 
            label="Business" 
            isOpen={isBusinessOpen} 
            onToggle={() => setIsBusinessOpen(!isBusinessOpen)} 
          />
          
          <div className={clsx("space-y-1 transition-all duration-300 ease-in-out", !isBusinessOpen && "hidden")}>
            {/* Primary Business Links */}
            {businessPrimary.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
              />
            ))}

            {/* "More" Collapsible */}
            <MoreToggle 
              isOpen={isMoreOpen} 
              isActive={isMoreActive} 
              onToggle={() => setIsMoreOpen(!isMoreOpen)} 
            />
            
            <div className={clsx("space-y-1 pl-3 transition-all duration-300 ease-in-out", !isMoreOpen && "hidden")}>
              {/* Small indent for hierarchy visual */}
              <div className="border-l-2 border-[var(--border-subtle)] pl-1 space-y-1">
                {businessMore.map((link) => (
                  <SidebarLink
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    icon={link.icon}
                    isSubItem // Optional: adds extra padding if styled that way
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* --- PERSONAL SECTION --- */}
        <div>
          <SectionHeader 
            label="Personal" 
            isOpen={isPersonalOpen} 
            onToggle={() => setIsPersonalOpen(!isPersonalOpen)} 
          />
          <div className={clsx("space-y-1 transition-all duration-300 ease-in-out", !isPersonalOpen && "hidden")}>
            {personalLinks.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                label={link.label}
                icon={link.icon}
              />
            ))}
          </div>
        </div>

      </nav>

      {/* Footer */}
      <div className="h-16 flex-shrink-0 border-t border-[var(--border-subtle)] bg-[var(--sidebar-bg)]" />
    </aside>
  )
}

/* --- Sub-components --- */

function SectionHeader({ label, isOpen, onToggle }: { label: string, isOpen: boolean, onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="mb-2 flex w-full items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-[var(--sidebar-muted)] hover:text-[var(--sidebar-text)] focus:outline-none"
    >
      <span>{label}</span>
      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
  )
}

function MoreToggle({
  isOpen,
  isActive,
  onToggle,
}: {
  isOpen: boolean
  isActive: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        'group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors',
        isActive || isOpen
          ? 'bg-[var(--sidebar-active)] font-semibold text-[var(--primary)]'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--primary)]',
      )}
      aria-expanded={isOpen}
    >
      <MoreHorizontal
        className={clsx(
          'h-5 w-5 flex-shrink-0',
          isActive || isOpen
            ? 'text-[var(--primary)]'
            : 'text-[var(--sidebar-muted)] group-hover:text-[var(--primary)]',
        )}
        strokeWidth={1.5}
      />
      <span className="flex-1 text-left">More</span>
      {isOpen ? (
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 text-[var(--sidebar-muted)] group-hover:text-[var(--primary)]"
          strokeWidth={1.5}
        />
      ) : (
        <ChevronRight
          className="h-4 w-4 flex-shrink-0 text-[var(--sidebar-muted)] group-hover:text-[var(--primary)]"
          strokeWidth={1.5}
        />
      )}
    </button>
  )
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  isSubItem,
}: {
  href: string
  label: string
  icon: React.ElementType
  isSubItem?: boolean
}) {
  const pathname = usePathname()

  const isActive = href === '/' 
    ? pathname === '/' 
    : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <a
      href={href}
      className={clsx(
        'group flex items-center gap-3 rounded-[var(--radius-md)] py-2 text-sm font-medium transition-colors no-underline',
        isSubItem ? 'px-3' : 'px-3', 
        isActive
          ? 'bg-[var(--sidebar-active)] text-[var(--primary)]'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        size={18}
        className={clsx(
          'flex-shrink-0 transition-colors',
          isActive
            ? 'text-[var(--primary)]'
            : 'text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]'
        )}
      />
      <span className="truncate">{label}</span>
    </a>
  )
}
