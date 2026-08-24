import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public, read-only data (site content + active products) is safe to read
// with the anon key straight from a Server Component — RLS (see
// supabase/schema.sql) only allows public SELECT on that data.
// There is no browser Supabase client yet: phase 1 has no client-side
// writes, so everything below only ever runs on the server.

let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
    );
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return cached;
}
