/** Clé publique Supabase (wizard Next.js ou ancien nom anon). */
export function getSupabaseKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      'Définissez NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local'
    )
  }

  return key
}
