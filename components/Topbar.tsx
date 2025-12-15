'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, CalendarDays } from 'lucide-react';
import { useAppState } from '@/app/state-provider';
import { Button } from '@/components/ui/Button';

// --- Main Topbar Component ---
export function Topbar() {
  const { dispatch } = useAppState();

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-header)] px-4 sm:px-6">
      {/* 1. Left Side: Mobile Sidebar Toggle */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="text-[var(--text-secondary)] lg:hidden"
        >
          <span className="sr-only">Toggle sidebar</span>
          <Menu size={20} />
        </Button>
      </div>

      {/* 2. Right Side: Actions */}
      <div className="flex items-center gap-3">
        {/* Agenda Button */}
        <Link
          href="/agenda"
          className="group flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-600)] hover:text-white no-underline hover:no-underline"
        >
          <CalendarDays
            size={18}
            strokeWidth={1.5}
            className="text-white transition-colors group-hover:text-white"
          />
          <span>Agenda</span>
        </Link>

        {/* Notes Button */}
        <Link
          href="/notes"
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-warning)] px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-95 no-underline hover:no-underline"
        >
          <span>Notes</span>
        </Link>
      </div>
    </header>
  );
}
