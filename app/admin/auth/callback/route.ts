import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAuthClient } from "@/lib/supabase/admin-client";

// Where the password-reset email lands.
//
// Supabase's link goes to its own /auth/v1/verify first, which bounces here
// with a one-time `code`. Exchanging it sets the session cookie, and the
// reset page then just needs a signed-in user. That exchange has to happen
// somewhere that can write cookies, which rules out a Server Component —
// hence a route handler.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // Supabase reports expired or already-used links here rather than in the
  // exchange, so surface its wording to the login page.
  const errorDescription = url.searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/admin/login?reset=${encodeURIComponent(errorDescription)}`, url.origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?reset=missing", url.origin));
  }

  const supabase = await getSupabaseAuthClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Most often: the link was opened in a different browser from the one
    // that asked for it, so the PKCE verifier cookie isn't there.
    return NextResponse.redirect(new URL("/admin/login?reset=expired", url.origin));
  }

  return NextResponse.redirect(new URL("/admin/reset-password", url.origin));
}
