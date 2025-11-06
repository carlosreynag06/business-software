// app/(app)/layout.tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ClientWrapper } from '@/components/ClientWrapper';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const h = await headers();
    // Best-effort current-path detection on the server with safe fallbacks.
    let currentPath =
      h.get('x-invoke-path') ||
      h.get('x-invoke-pathname') ||
      h.get('x-pathname') ||
      h.get('next-url') ||
      '/';

    if (!currentPath.startsWith('/')) currentPath = `/${currentPath}`;

    // Redirect to login, passing the current path as 'next'
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  // If session exists, wrap children in the ClientWrapper
  return <ClientWrapper>{children}</ClientWrapper>;
}