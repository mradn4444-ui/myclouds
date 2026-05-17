import { createBrowserClient } from '@supabase/ssr'

export function getSupabaseKey(): string {
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      'Définissez VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY'
    )
  }

  return key
}

export function createClient() {
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    getSupabaseKey()
  )
}
