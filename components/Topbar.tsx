// components/Topbar.tsx
'use client';

import React from 'react';
import { Search, Plus, Sparkles, User, Menu } from 'lucide-react';
import { useAppState } from '@/app/state-provider';
import { Button } from '@/components/ui/Button';

// ---  Main Topbar Component ---
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

      {/* 2. Right Side: Actions (per design doc) */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <span className="sr-only">Search</span>
          <Search size={20} strokeWidth={1.5} />
        </Button>

        {/* Quick Add */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <span className="sr-only">Quick Add</span>
          <Plus size={20} strokeWidth={2} />
        </Button>

        {/* AI Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <span className="sr-only">AI Assistant</span>
          <Sparkles size={20} strokeWidth={1.5} />
        </Button>

        {/* Owner Menu */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-050)] text-[var(--primary)]"
          aria-label="Owner menu and settings"
        >
          <User size={18} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}