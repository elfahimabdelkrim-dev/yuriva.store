// Server-side admin authentication guard for API routes.
// Uses the SAME Supabase Auth session (cookie-based) that the admin
// dashboard login (/admin/login → signInWithPassword) creates.
//
// Usage in a route handler:
//   const auth = await requireAdmin();
//   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 503; error: string };

export async function requireAdmin(): Promise<AdminAuthResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, status: 503, error: "Auth not configured" };
  }

  try {
    // Cookie-bound anon client — reads the admin's Supabase Auth session.
    // getUser() validates the JWT against Supabase Auth (not just local decode).
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return { ok: false, status: 401, error: "Unauthorized" };
    }

    return { ok: true, userId: data.user.id };
  } catch {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
}
