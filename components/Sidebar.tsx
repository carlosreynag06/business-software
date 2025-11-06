// components/Sidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Network,
  Calendar,
  Briefcase,
  School,
  WalletCards, // <-- CORRECTED: Was 'Passport'
  Megaphone,
  CreditCard,
  TrendingUp,
  BarChart3,
  Wand2,
  Sparkles,
  Settings,
} from 'lucide-react';

/* --- Navigation Data (App Router route-group style) --- */
const navLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm', label: 'CRM Pipeline', icon: Network },
  { href: '/activities', label: 'Activities & Scheduler', icon: Calendar },
  { href: '/projects', label: 'Projects', icon: Briefcase },
  { href: '/classes', label: 'Classes', icon: School },
  { href: '/visa', label: 'Visa Cases', icon: WalletCards }, // <-- CORRECTED
  { href: '/social', label: 'Social Media', icon: Megaphone },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/marketing', label: 'Marketing Touches', icon: TrendingUp },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/automations', label: 'Automations', icon: Wand2 },
  { href: '/assistant', label: 'AI Assistant', icon: Sparkles },
];

const settingsLink = {
  href: '/settings',
  label: 'Settings',
  icon: Settings,
};

/* --- Main Sidebar Component --- */
export function Sidebar() {
  return (
    // Desktop sidebar (lg) only
    <aside className="hidden h-screen w-64 flex-col border-r border-r-[var(--sidebar-bg)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] lg:flex">
      {/* 1) Logo/Header */}
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="font-sans text-xl font-bold text-white">
          My Business Software
        </Link>
      </div>

      {/* 2) Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-1">
          <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-muted)]">
            Menu
          </h3>
          {navLinks.map((link) => (
            <SidebarLink
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </div>
      </nav>

      {/* 3) Footer (Settings) */}
      <div className="border-t border-t-[var(--sidebar-hover)] p-4">
        <SidebarLink
          href={settingsLink.href}
          label={settingsLink.label}
          icon={settingsLink.icon}
        />
      </div>
    </aside>
  );
}

/* --- Internal Sub-components --- */
function SidebarLink({
  href,
  label,
  icon: Icon,
  count,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}) {
  const pathname = usePathname();

  // Active state: root route vs. nested routes
  const isRoot = href === '/';
  const isActive = isRoot
    ? pathname === '/'
    : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={clsx(
        'group flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[var(--sidebar-active)] text-white'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)] hover:text-white'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={clsx(
          'h-5 w-5 flex-shrink-0',
          isActive
            ? 'text-white'
            : 'text-[var(--sidebar-muted)] group-hover:text-white'
        )}
        strokeWidth={1.5}
      />
      <span className="flex-1">{label}</span>
      {count && count > 0 && <SidebarBadge count={count} />}
    </Link>
  );
}

function SidebarBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-white">
      {count}
    </span>
  );
}