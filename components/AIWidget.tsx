// components/AIWidget.tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Paperclip,
  Mic,
  Send,
  Sparkles,
  FileText,
  Loader2,
  Check,
  ClipboardCheck,
  X, // Added for closing modal
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ToastProvider'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/
type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  files?: { name: string; type: 'pdf' | 'image' }[]
}

type MockSuggestion = {
  id: string
  label: string
  prompt: string
}

/*
|--------------------------------------------------------------------------
| Mock Data
|--------------------------------------------------------------------------
*/
const mockSuggestions: MockSuggestion[] = [
  {
    id: 's1',
    label: 'Find stale leads',
    prompt: 'Show me all leads that have been in the "Discovery" stage for over 14 days.',
  },
  {
    id: 's2',
    label: 'Summarize project',
    prompt: 'Summarize the status of the "Café Colonial" website project.',
  },
  {
    id: 's3',
    label: 'Draft follow-up',
    prompt:
      'Draft a professional follow-up email to Ana Gómez regarding her website proposal.',
  },
]

const mockFileAnalysis = {
  id: 'diff-1',
  fileName: 'Contract_v2.pdf',
  extracted: [
    { field: 'Client Name', value: 'Pizzeria Bella' },
    { field: 'Service Type', value: 'social_media' },
    { field: 'Total Value (RD$)', value: '45,000.00' },
  ],
}

/*
|--------------------------------------------------------------------------
| Main Component (Redesigned as Floating Widget)
|--------------------------------------------------------------------------
*/
export default function AIWidget() {
  const { notify } = useToast()
  const [isOpen, setIsOpen] = useState(false) // State to control the modal
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'ai',
      content:
        'Hello! I am your AI assistant. How can I help you manage your business today?',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showDiffPanel, setShowDiffPanel] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = (prompt: string) => {
    if (isLoading || !prompt.trim()) return
    
    setIsLoading(true)
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'ai',
        content: `Here is the information you requested about "${prompt.substring(0, 20)}..."`,
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(input)
  }

  const handleSuggestionClick = (prompt: string) => {
    handleSend(prompt)
  }

  const handleMicClick = () => {
    if (isRecording) {
      setIsRecording(false)
      notify({
        title: 'Transcript Attached',
        description: 'Your voice memo has been attached (simulated).',
        variant: 'info',
      })
    } else {
      setIsRecording(true)
      notify({
        title: 'Recording Started',
        description: 'Recording... click again to stop (simulated).',
        variant: 'info',
      })
    }
  }

  const handleFileClick = () => {
    notify({
      title: 'File Attached',
      description: 'Contract_v2.pdf has been attached (simulated).',
      variant: 'info',
    })
    
    // Simulate file analysis and show diff panel
    setIsLoading(true)
    setTimeout(() => {
       const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: "Please analyze this file.",
        files: [{ name: 'Contract_v2.pdf', type: 'pdf' }]
      }
      setMessages((prev) => [...prev, userMessage])

      setTimeout(() => {
         const aiResponse: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'ai',
          content: `I've analyzed "Contract_v2.pdf". I found 3 fields that can be applied to the "Pizzeria Bella" lead. Please review the proposed changes.`,
        }
        setMessages((prev) => [...prev, aiResponse])
        setShowDiffPanel(true)
        setIsLoading(false)
      }, 1500)

    }, 1000)
  }
  
  const handleApplyChanges = () => {
    setShowDiffPanel(false)
    notify({
      title: 'Changes Applied',
      description: 'The extracted fields have been applied to the lead.',
      variant: 'success'
    })
    
    const aiResponse: Message = {
      id: `msg-${Date.now() + 2}`,
      role: 'ai',
      content: `Great! I've applied those changes to the "Pizzeria Bella" lead.`,
    }
    setMessages((prev) => [...prev, aiResponse])
  }

  const handleClose = () => {
    setIsOpen(false)
    // Reset diff panel when closing
    setTimeout(() => {
        setShowDiffPanel(false)
    }, 300)
  }

  return (
    <>
      {/* 1. Floating Action Button (Trigger) */}
      <motion.div
        className="fixed bottom-6 right-6 z-[990]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3, ease: 'easeOut' }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Assistant"
          className="h-14 w-14 rounded-full shadow-[var(--shadow-3)]"
        >
          <Sparkles size={24} />
        </Button>
      </motion.div>

      {/* 2. AI Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative z-10 flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-elev-1)] shadow-[var(--shadow-3)]"
            >
              {/* Left Pane: Chat */}
              <div className="flex h-full flex-1 flex-col border-r border-[var(--border-subtle)]">
                {/* Chat History */}
                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isLoading && <LoadingBubble />}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestion Chips */}
                <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
                  {mockSuggestions.map((sug) => (
                    <button
                      key={sug.id}
                      onClick={() => handleSuggestionClick(sug.prompt)}
                      disabled={isLoading}
                      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-elev-2)] disabled:opacity-50"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSubmit}
                  className="flex w-full items-center gap-2 border-t border-[var(--border-subtle)] bg-[var(--surface-elev-2)] p-4"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleFileClick}
                    disabled={isLoading}
                    aria-label="Attach file"
                  >
                    <Paperclip size={20} className="text-[var(--text-secondary)]" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleMicClick}
                    disabled={isLoading}
                    aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    className={clsx(isRecording && 'text-[var(--danger)]')}
                  >
                    {isRecording ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Mic size={20} />
                      </motion.div>
                    ) : (
                      <Mic size={20} className="text-[var(--text-secondary)]" />
                    )}
                  </Button>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message or drop a file..."
                    disabled={isLoading}
                    className="block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elev-1)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-sm transition-colors placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send size={18} />
                  </Button>
                </form>
              </div>

              {/* Right Pane: Action & Diff */}
              <AnimatePresence>
                {showDiffPanel && (
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="h-full w-full max-w-sm flex-shrink-0 border-l border-[var(--border-subtle)] bg-[var(--bg-surface)]"
                  >
                    <DiffPanel data={mockFileAnalysis} onApply={handleApplyChanges} onClose={() => setShowDiffPanel(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

/*
|--------------------------------------------------------------------------
| Sub-Components (Copied from your provided file)
|--------------------------------------------------------------------------
*/

// Chat Bubble Component
function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  
  return (
    <div
      className={clsx(
        'flex w-full items-start gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--bg-muted)] text-[var(--primary)]',
        )}
      >
        {isUser ? (
          <span className="text-sm font-bold">U</span>
        ) : (
          <Sparkles size={18} />
        )}
      </div>
      <div
        className={clsx(
          'w-auto max-w-md space-y-2 rounded-[var(--radius-md)] px-4 py-3',
          isUser
            ? 'bg-[var(--primary)] text-white'
            : 'bg-[var(--bg-muted)] text-[var(--text-primary)]',
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.files && (
          <div className="mt-2 rounded-[var(--radius-sm)] border border-black/10 bg-black/10 p-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
               <FileText size={16} />
               <span>{message.files[0].name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Loading... Bubble
function LoadingBubble() {
  return (
    <div className="flex w-full items-start gap-3">
      <div
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          'bg-[var(--bg-muted)] text-[var(--primary)]',
        )}
      >
        <Sparkles size={18} />
      </div>
      <div
        className={clsx(
          'w-auto max-w-md rounded-[var(--radius-md)] px-4 py-3',
          'bg-[var(--bg-muted)] text-[var(--text-primary)]',
        )}
      >
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-1.5"
        >
          <div className="h-2 w-2 rounded-full bg-current" />
          <div className="h-2 w-2 rounded-full bg-current" />
          <div className="h-2 w-2 rounded-full bg-current" />
        </motion.div>
      </div>
    </div>
  )
}

// Action & Diff Panel
function DiffPanel({ data, onApply, onClose }: { data: typeof mockFileAnalysis, onApply: () => void, onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
        <h3 className="font-sans text-lg font-semibold text-[var(--text-primary)]">
          Proposed Changes
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel">
          <X size={20} className="text-[var(--text-secondary)]" />
        </Button>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Found <strong>{data.extracted.length} fields</strong> from{' '}
          <strong className="text-[var(--text-primary)]">{data.fileName}</strong>.
        </p>
        
        <div className="space-y-2">
          {data.extracted.map((item, index) => (
            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3">
              <label htmlFor={`field-${index}`} className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">{item.field}</div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{item.value}</div>
                </div>
                <input
                  id={`field-${index}`}
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-muted)] p-4">
        <Button onClick={onApply} className="w-full">
          <ClipboardCheck size={16} className="mr-2" />
          Apply Changes
        </Button>
      </div>
    </div>
  )
}