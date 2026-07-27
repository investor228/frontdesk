import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Runs before every matched route: refreshes the Supabase session cookie and
 * keeps signed-out visitors out of the dashboard.
 *
 * Next 16 renamed the `middleware` convention to `proxy`; the runtime here is
 * always Node.js, which is what @supabase/ssr needs.
 */
export async function proxy(request: NextRequest) {
  // Without credentials there is no session to refresh — let the request
  // through so the marketing pages still render on a fresh clone.
  if (!supabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refreshes an expired session cookie. Must run before any auth check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /*
   * Everything except static assets, the widget loader and the embed route —
   * the widget must stay reachable from third-party sites with no session.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|widget.js|embed|api/widget|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
