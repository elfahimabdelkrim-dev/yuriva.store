// Server-side admin authentication guard for API routes.
//
// Uses EXACTLY the same Supabase Auth session mechanism as the admin login:
//   - /admin/login calls signInWithPassword via createBrowserClient (@supabase/ssr)
//     -> the session is stored in sb-<ref>-auth-token cookies (chunked),
//        Path=/, SameSite=Lax, Secure on HTTPS - sent automatically on
//        same-origin fetches (and explicitly with credentials: "include").
//   - This guard reads those same cookies via the cookie-bound server client
//     (lib/supabase/server.ts createClient -> createServerClient from
//     @supabase/ssr with cookies() from next/headers).
//
// getUser() validates the JWT against the Supabase Auth server (not a local
// decode) and transparently refreshes an expired access token when a valid
// refresh token cookie is present (setAll persists the refreshed cookies -
// supported inside Route Handlers).
//
// Status codes:
//   401 - no session / expired session that cannot be refreshed
//   403 - valid session, but the user is not in the ADMIN_EMAILS allowlist
//   503 - Supabase auth is not configured at all
//
// Optional env var ADMIN_EMAILS (comma-separated, case-insensitive):
//   When set, only those emails are treated as admins (403 otherwise).
//   When not set, ANY authenticated Supabase user is treated as an admin -
//   this matches the current store setup where only admins have accounts.
//
// SECURITY: never log tokens, cookie values, or the raw user object.

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 503; error: string };

export async function requireAdmin(): Promise<AdminAuthResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: "Auth not configured" };
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      // No cookie, invalid session, or refresh failed -> not logged in
      return { ok: false, status: 401, error: "Unauthorized - no valid admin session. Log in at /admin/login" };
    }

    // Optional allowlist: ADMIN_EMAILS="a@x.com,b@y.com"
    const allowlist = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (allowlist.length > 0) {
      const email = (data.user.email ?? "").toLowerCase();
      if (!email || !allowlist.includes(email)) {
        // Authenticated, but not an authorized admin
        return { ok: false, status: 403, error: "Forbidden - this account is not an authorized admin" };
      }
    }

    return { ok: true, userId: data.user.id };
  } catch {
    return { ok: false, status: 401, error: "Unauthorized - session check failed" };
  }
}
