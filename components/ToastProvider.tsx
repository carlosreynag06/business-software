// components/ToastProvider.tsx
'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  PropsWithChildren,
} from 'react';
import { createPortal } from 'react-dom';

/*
=======================================================================================
 Toasts per My Business Software Design
 Position: top-right
 Variants: success, info, warning, danger
 Duration: 4.5s default
 Pause on hover; resume on mouse leave
 Radius: md; Shadow: elev-3;
 Accessible: role="status", aria-live="polite"
======================================================================================
*/

export type ToastVariant = 'success' | 'info' | 'warning' | 'danger';

export type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
  action?: { label: string; onClick: () => void };
};

type ToastInternal = Required<ToastOptions> & {
  id: string;
  createdAt: number;
  remaining: number;
  paused: boolean;
};

type ToastContextValue = {
  notify: (opts: ToastOptions) => string; // returns id
  dismiss: (id: string) => void;
  clear: () => void;
};

const DEFAULT_DURATION = 4500; // 4.5 seconds
const ToastContext = createContext<ToastContextValue | null>(null);

// Lightweight pub-sub so you can call toast() outside React trees if needed.
const listeners = new Set<(opts: ToastOptions) => void>();
export function toast(opts: ToastOptions) {
  if (listeners.size === 0) {
    // No provider mounted yet; noop.
    return;
  }
  listeners.forEach((fn) => fn(opts));
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

function variantStyles(variant: ToastVariant) {
  // Uses CSS variables defined in globals.css
  const map = {
    success: {
      tint: 'var(--color-success)',
      ring: '0 0 0 1.5px var(--color-success)',
      badgeBg: 'color-mix(in oklab, var(--color-success) 18%, black)',
    },
    info: {
      tint: 'var(--color-info)',
      ring: '0 0 0 1.5px var(--color-info)',
      badgeBg: 'color-mix(in oklab, var(--color-info) 18%, black)',
    },
    warning: {
      tint: 'var(--color-warning)',
      ring: '0 0 0 1.5px var(--color-warning)',
      badgeBg: 'color-mix(in oklab, var(--color-warning) 22%, black)',
    },
    danger: {
      tint: 'var(--color-danger)',
      ring: '0 0 0 1.5px var(--color-danger)',
      badgeBg: 'color-mix(in oklab, var(--color-danger) 18%, black)',
    },
  } as const;
  return map[variant];
}

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const stroke = variantStyles(variant).tint;
  // Inline SVGs: simple, dependency-free, accessible
  switch (variant) {
    case 'success':
      return (
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="shrink-0"
          style={{ color: stroke }}
        >
          <path
            d="M9 12.75l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'info':
      return (
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="shrink-0"
          style={{ color: stroke }}
        >
          <path
            d="M12 8h.01M11 12h1v4h1M21 12A9 9 0 113 12a9 9 0 0118 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="shrink-0"
          style={{ color: stroke }}
        >
          <path
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'danger':
      return (
        <svg
          aria-hidden
          width="20"
          height="20"
          viewBox="0 0 24 24"
          className="shrink-0"
          style={{ color: stroke }}
        >
          <path
            d="M12 9v4m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function CloseIcon() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastInternal[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map()); // window.setTimeout id
  const mounted = useRef(false);
  const [isClient, setIsClient] = useState(false);

  // Subscribe imperative API
  useEffect(() => {
    setIsClient(true);
    const sub = (opts: ToastOptions) => addToast(opts);
    listeners.add(sub);
    return () => {
      listeners.delete(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimer = useCallback((id: string) => {
    const t = timeouts.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timeouts.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, ms: number) => {
      clearTimer(id);
      const timeoutId = window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        clearTimer(id);
      }, ms);
      timeouts.current.set(id, timeoutId);
    },
    [clearTimer]
  );

  const addToast = useCallback(
    (opts: ToastOptions) => {
      const id =
        opts.id ?? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const duration = Math.max(1000, opts.duration ?? DEFAULT_DURATION);
      const newToast: ToastInternal = {
        id,
        title: opts.title ?? '',
        description: opts.description ?? '',
        variant: opts.variant ?? 'info',
        duration,
        action: opts.action ?? (undefined as any),
        createdAt: Date.now(),
        remaining: duration,
        paused: false,
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 5)); // cap queue at 5
      // Schedule auto-dismiss after initial render
      queueMicrotask(() => scheduleDismiss(id, duration));
      return id;
    },
    [scheduleDismiss]
  );

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const clear = useCallback(() => {
    timeouts.current.forEach((_, id) => clearTimer(id));
    setToasts([]);
  }, [clearTimer]);

  // Pause/resume on hover
  const onMouseEnter = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const elapsed = Date.now() - t.createdAt;
        const remaining = Math.max(0, t.duration - elapsed);
        clearTimer(id);
        return { ...t, paused: true, remaining };
      })
    );
  };

  const onMouseLeave = (id: string) => {
    const t = toasts.find((x) => x.id === id);
    if (!t) return;
    const reCreated = {
      ...t,
      paused: false,
      createdAt: Date.now(),
      duration: t.remaining,
    };
    setToasts((prev) => prev.map((x) => (x.id === id ? reCreated : x)));
    scheduleDismiss(id, t.remaining);
  };

  // Dismiss latest on Escape
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToasts((prev) => {
          if (prev.length === 0) return prev;
          const [latest, ...rest] = prev;
          clearTimer(latest.id);
          return rest;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clearTimer]);

  const ctx = useMemo<ToastContextValue>(
    () => ({ notify: addToast, dismiss, clear }),
    [addToast, dismiss, clear]
  );

  const viewport = (
    <div
      className="pointer-events-none fixed right-6 top-6 z-[1100] flex w-full max-w-[420px] flex-col gap-3"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => {
        const vs = variantStyles(t.variant);
        return (
          <div
            key={t.id}
            role="status"
            onMouseEnter={() => onMouseEnter(t.id)}
            onMouseLeave={() => onMouseLeave(t.id)}
            className="pointer-events-auto relative overflow-hidden rounded-[var(--radius-md)] border bg-[var(--color-bg-card)] p-4 text-[var(--color-text)]"
            style={{
              borderColor: 'var(--color-border-subtle)',
              // Updated to shadow-3 for overlays per new design spec 
              boxShadow: 'var(--shadow-3)',
              transition:
                'transform 200ms cubic-bezier(0.2,0,0,1), opacity 200ms cubic-bezier(0.2,0,0,1)',
            }}
          >
            {/* Left accent bar */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1"
              style={{ background: vs.tint }}
            />
            <div className="flex items-start gap-3 pr-8">
              <div
                className="mt-0.5 rounded-[10px] p-1.5"
                style={{ background: vs.badgeBg }}
              >
                <VariantIcon variant={t.variant} />
              </div>
              <div className="min-w-0 flex-1">
                {t.title ? (
                  <div className="mb-0.5 truncate text-[0.95rem] font-semibold leading-6">
                    {t.title}
                  </div>
                ) : null}
                {t.description ? (
                  <div className="text-[0.9rem] leading-6 text-[var(--color-text-muted)]">
                    {t.description}
                  </div>
                ) : null}
                {t.action ? (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        t.action!.onClick();
                      } finally {
                        dismiss(t.id);
                      }
                    }}
                    className="mt-2 inline-flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-[0.875rem] font-medium outline-none ring-0 transition-colors hover:underline focus-visible:outline-none"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {t.action.label}
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismiss(t.id)}
                className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--color-text-soft)] outline-none transition hover:bg-[var(--bg-muted)] hover:text-[var(--color-text)] focus-visible:outline-none"
                style={{
                  boxShadow: t.paused
                    ? variantStyles(t.variant).ring
                    : 'none',
                }}
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {isClient ? createPortal(viewport, document.body) : null}
    </ToastContext.Provider>
  );
}
