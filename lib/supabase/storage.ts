// lib/supabase/storage.ts
// Client-side Supabase Storage helpers.
// All uploads use the anon key (browser) — bucket must be PUBLIC.

export const BUCKET = "product-images";

export type UploadFolder = "products" | "categories" | "homepage" | "media";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ─── Validation ───────────────────────────────────────────────────────────
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "نوع الملف غير مقبول، استعمل JPG أو PNG أو WEBP";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "حجم الصورة كبير، خاصها تكون أقل من 5MB";
  }
  return null; // valid
}

// ─── Path builder ─────────────────────────────────────────────────────────
export function buildStoragePath(folder: UploadFolder, subfolder: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const ts  = Date.now();
  const rnd = Math.random().toString(36).slice(2, 7);
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 40);
  return `${folder}/${subfolder}/${ts}-${rnd}-${safeName}.${ext}`;
}

// ─── Core upload ──────────────────────────────────────────────────────────
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  subfolder = "general"
): Promise<UploadResult> {
  const validError = validateImageFile(file);
  if (validError) return { success: false, error: validError };

  try {
    const { createClient } = await import("@/lib/supabase/client");
    const sb = createClient();
    const path = buildStoragePath(folder, subfolder, file);

    const { error } = await sb.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "31536000", upsert: false });

    if (error) {
      if (
        error.message?.toLowerCase().includes("bucket") ||
        error.message?.toLowerCase().includes("not found") ||
        error.message?.toLowerCase().includes("does not exist")
      ) {
        return {
          success: false,
          error: `خاصك تصايب bucket "${BUCKET}" فـ Supabase Storage وتخليه Public باش تقدر ترفع الصور`,
        };
      }
      return { success: false, error: `وقع خطأ فرفع الصورة: ${error.message}` };
    }

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, url: publicUrl };
  } catch (err) {
    console.error("uploadImage error:", err);
    return { success: false, error: "وقع خطأ فرفع الصورة" };
  }
}

// ─── Typed shortcuts ──────────────────────────────────────────────────────
export const uploadProductImage  = (file: File, slug: string) => uploadImage(file, "products",   slug || "general");
export const uploadCategoryImage = (file: File, slug: string) => uploadImage(file, "categories", slug || "general");
export const uploadHomepageImage = (file: File, section: string) => uploadImage(file, "homepage", section || "general");
export const uploadMediaImage    = (file: File) => uploadImage(file, "media", "general");

// ─── Get public URL from known path ───────────────────────────────────────
export async function getPublicUrl(path: string): Promise<string> {
  const { createClient } = await import("@/lib/supabase/client");
  const sb = createClient();
  const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}
