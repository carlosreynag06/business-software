// app/(app)/ai-assistant/page.tsx
'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

export default function AIAssistantPage() {
  return (
    <div className="flex h-full flex-col gap-5">
      {/* 1. Header */}
      <div>
        <h1 className="font-sans text-[28px] font-bold text-[var(--text-primary)]">
          AI Assistant
        </h1>
        <p className="mt-1 text-base text-[var(--text-secondary)]">
          Interact with your data using natural language
        </p>
      </div>

      {/* 2. Informational Panel - MODIFIED: Removed border */}
      <div className="flex-1 rounded-[var(--radius-lg)] bg-[var(--surface-elev-1)] p-6 shadow-[var(--shadow-1)]">
        <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-050)] text-[var(--primary)]">
            <Sparkles size={32} />
          </div>
          <h3 className="mt-4 font-sans text-xl font-semibold text-[var(--text-primary)]">
            AI Assistant is Active
          </h3>
          <p className="mt-2 text-base text-[var(--text-secondary)]">
            Click the sparkle icon in the bottom-right corner to open the
            assistant panel from anywhere in the application.
          </p>
        </div>
      </div>
    </div>
  )
}