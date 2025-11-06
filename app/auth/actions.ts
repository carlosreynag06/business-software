// app/auth/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function login(_: unknown, formData: FormData) {
  const email = (formData.get('email') || '').toString().trim();
  const password = (formData.get('password') || '').toString();

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  // ✅ Land on the dashboard at "/" (route-group style)
  redirect('/');
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
