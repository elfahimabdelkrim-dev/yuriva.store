import { NextRequest, NextResponse } from "next/server";

const BUCKET = "product-images";
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data: { file, folder, subfolder }
 * Uses service role to bypass storage RLS — never exposes key to frontend.
 */
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { success: false, error: "SUPABASE_SERVICE_ROLE_KEY ما مضبوطش فـ .env.local" },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const file    = formData.get("file")      as File   | null;
    const folder  = (formData.get("folder")   as string) || "media";
    const subfolder = (formData.get("subfolder") as string) || "general";

    if (!file || typeof file === "string") {
      return NextResponse.json({ success: false, error: "ما وصلناش فايل" }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "نوع الملف غير مقبول، استعمل JPG أو PNG أو WEBP" },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "حجم الصورة كبير، خاصها تكون أقل من 5MB" },
        { status: 400 }
      );
    }

    // Build safe storage path
    const ext      = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const ts       = Date.now();
    const rnd      = Math.random().toString(36).slice(2, 7);
    const safeName = file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 40);
    const path = `${folder}/${subfolder}/${ts}-${rnd}-${safeName}.${ext}`;

    // Upload using service role (bypasses RLS / storage policies)
    const { createAdminClient } = await import("@/lib/supabase/server");
    const sb = createAdminClient();

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("[/api/admin/upload] Supabase storage error:", uploadError);
      return NextResponse.json(
        { success: false, error: `وقع مشكل فرفع الصورة: ${uploadError.message}` },
        { status: 400 }
      );
    }

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ success: true, url: publicUrl });

  } catch (err) {
    console.error("[/api/admin/upload] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "وقع مشكل فرفع الصورة. تأكد من Supabase Storage وكي bucket product-images موجود.",
      },
      { status: 500 }
    );
  }
}
