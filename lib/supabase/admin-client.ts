import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cookie-backed Supabase client for the owner's authenticated session.
//
// Every admin read and write goes through this, carrying Polly's JWT — so
// the RLS policies in supabase/rls.sql ("owner all products" etc.) are what
// actually authorise the write. The service-role key is never used, which
// means a bug here can't escalate past what she's allowed to do anyway.
//
// Must be created per request; never cache or share it across requests.
export async function getSupabaseAuthClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can read cookies but not write them. Token
            // refreshes are handled by proxy.ts instead, so swallowing this
            // is expected rather than a failure.
          }
        },
      },
    }
  );
}
