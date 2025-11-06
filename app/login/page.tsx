// app/login/page.tsx
'use client';

import React from 'react';
// Import useFormStatus from 'react-dom', but useActionState from 'react'
import { useFormStatus } from 'react-dom';
import { useActionState } from 'react';
import { login } from '@/app/auth/actions';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

// Initial state for the form
const initialState: { error: string | null } = {
  error: null,
};

// ---  Submit Button ---
// A local component to show a pending state during form submission
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[var(--primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Loader2 size={16} className="mr-2 animate-spin" />
          Ingresando...
        </>
      ) : (
        'Ingresar'
      )}
    </button>
  );
}

// ---  Login Page ---
export default function LoginPage() {
  // useActionState maps the server action's return value to our state
  const [state, formAction] = useActionState(login, initialState);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[var(--bg-page)] p-4">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-3)]">
        {/* Logo */}
        <h1 className="mb-6 text-center font-sans text-2xl font-bold text-[var(--text-primary)]">
          My Business Software
        </h1>

        <form action={formAction} className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-tertiary)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          </div>

          {/* Error Message */}
          {state?.error && (
            <div
              aria-live="polite"
              className="rounded-md border border-[var(--danger)]/50 bg-[var(--danger)]/10 p-3 text-sm font-medium text-[var(--danger)]"
            >
              {state.error}
            </div>
          )}

          {/* Submit Button */}
          <SubmitButton />
        </form>

        {/* Forgot Password Link */}
        <div className="mt-6 text-center">
          <Link
            href="#" // Placeholder for password reset page
            className="text-sm text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
    </div>
  );
}