// components/ClientWrapper.tsx
'use client';

import React from 'react';
import { AppStateProvider } from '@/app/state-provider';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';

/**
 * This client component wraps the main application shell.
 * It sets up all global client-side providers
 * (State) so that the Sidebar, Topbar, and
 * page content can all consume them.
 *
 * ToastProvider is in the root layout (app/layout.tsx).
 */
export function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppStateProvider>
      {/* This layout structure is based on your Variedades Velez codebase.
        It uses the new design system's dark mode variables from globals.css
      */}
      <div className="flex h-screen w-full bg-[var(--sidebar-bg)]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-y-auto">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-[var(--bg-page)] p-6">
            {/* Constrain content width as per your design spec (1200px laptop) */}
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </AppStateProvider>
  );
}