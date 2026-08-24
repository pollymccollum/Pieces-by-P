import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the owner's Supabase session on admin requests.
//
// Server Components can't write cookies, so without this the auth token
// would eventually go stale and Polly would get logged out at random.
// Here we CAN write to the response, so refreshed tokens persist.
//
// This is not the security boundary — it only keeps the session alive.
// Access is enforced by requireOwner() in lib/auth.ts, which every admin
// page and every server action calls. See the Next.js auth guide: checks
// belong next to the data, not in middleware or layouts.
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touching getUser() is what triggers the refresh-and-write.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
