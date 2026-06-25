export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getConfigStatus, testConnection } from "@/lib/google-sheets";

// GET — load settings + env status
export async function GET() {
  const envStatus = getConfigStatus();

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { success: true, data: null, hasKey: envStatus.hasPrivateKey, ...envStatus },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const { createAdminClient } = await import("@/lib/supabase/server");
    const { data } = await createAdminClient()
      .from("google_sheets_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      { success: true, data, hasKey: envStatus.hasPrivateKey, ...envStatus },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { success: true, data: null, hasKey: envStatus.hasPrivateKey, ...envStatus },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

// PUT — save settings (never save private key)
export async function PUT(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ success: false, error: "no_supabase" }, { status: 503 });

  try {
    const raw = await req.json() as Record<string, unknown>;

    // Strip any private key fields — must ONLY live in .env.local / Vercel env
    const { private_key: _pk, google_private_key: _gpk, GOOGLE_PRIVATE_KEY: _env, ...safe } = raw;
    void _pk; void _gpk; void _env;

    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    const { data: existing } = await sb
      .from("google_sheets_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      await sb
        .from("google_sheets_settings")
        .update({ ...safe, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await sb.from("google_sheets_settings").insert(safe);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "خطأ في الحفظ" }, { status: 500 });
  }
}

// POST — test connection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sheet_id?: string; service_account_email?: string };
    const status = getConfigStatus();

    if (!status.hasPrivateKey) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_PRIVATE_KEY ما موجودش فـ .env.local — زيده وعاود تشغيل السيرفر",
        diagnostics: { authConfigured: false, tokenFetchAttempted: false, spreadsheetAccess: false },
      });
    }
    if (!status.hasServiceEmail) {
      return NextResponse.json({
        success: false,
        error: "GOOGLE_SERVICE_ACCOUNT_EMAIL ما موجودش فـ .env.local",
        diagnostics: { authConfigured: false, tokenFetchAttempted: false, spreadsheetAccess: false },
      });
    }
    if (!status.privateKeyValid) {
      return NextResponse.json({
        success: false,
        error: "صيغة GOOGLE_PRIVATE_KEY غلوطة — خاصو يبدأ بـ -----BEGIN PRIVATE KEY-----",
        diagnostics: { authConfigured: false, tokenFetchAttempted: false, spreadsheetAccess: false },
      });
    }

    const sheetId = body.sheet_id?.trim() || process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json({
        success: false,
        error: "دخل Google Sheet ID أولاً",
        diagnostics: { authConfigured: true, tokenFetchAttempted: false, spreadsheetAccess: false },
      });
    }

    const result = await testConnection({
      sheetId,
      serviceEmail: body.service_account_email?.trim() || undefined,
    });

    return NextResponse.json({
      success: result.ok,
      error: result.error,
      diagnostics: result.diagnostics,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
