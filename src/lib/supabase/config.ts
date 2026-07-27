/**
 * Whether Supabase credentials are present.
 *
 * A fresh clone with no `.env.local` should still render the landing page
 * rather than throwing on a malformed client URL, so the auth paths check this
 * first and treat "not configured" as "signed out".
 */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
