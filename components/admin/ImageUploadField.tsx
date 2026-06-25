"use client";
/**
 * ImageUploadField
 * Reusable image upload component for all admin pages.
 * Upload goes through POST /api/admin/upload (service role, server-side).
 * This bypasses Supabase Storage RLS without exposing the service role key to the browser.
 */
import { useRef, useState } from "react";
import { Upload, X, Link2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { validateImageFile, type UploadFolder } from "@/lib/supabase/storage";

const PLACEHOLDER = "/images/placeholder-product.svg";

interface ImageUploadFieldProps {
  /** Current image URL (controlled) */
  value: string;
  /** Called with new public URL after upload or manual entry */
  onChange: (url: string) => void;
  /** Storage folder: products | categories | homepage | media */
  folder?: UploadFolder;
  /** Subfolder within the bucket folder (e.g. product slug) */
  subfolder?: string;
  /** Label shown above field */
  label?: string;
  /** Show as compact (no label, smaller preview) */
  compact?: boolean;
  /** Whether field is required */
  required?: boolean;
}

export default function ImageUploadField({
  value,
  onChange,
  folder = "media",
  subfolder = "general",
  label,
  compact = false,
  required = false,
}: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const clearMessages = () => { setErrorMsg(""); setSuccessMsg(""); };

  // Upload via server-side API route (uses service role — bypasses storage RLS)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    clearMessages();

    // Client-side validation first (saves a round-trip)
    const validErr = validateImageFile(file);
    if (validErr) {
      setErrorMsg(validErr);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      fd.append("subfolder", subfolder);

      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const json = await res.json() as { success: boolean; url?: string; error?: string };

      if (json.success && json.url) {
        onChange(json.url);
        setSuccessMsg("الصورة ترفعات بنجاح ✓");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        setErrorMsg(json.error || "وقع خطأ فرفع الصورة");
      }
    } catch {
      setErrorMsg("وقع خطأ فرفع الصورة — تحقق من الاتصال");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleManualSave = () => {
    if (!manualUrl.trim()) return;
    onChange(manualUrl.trim());
    setManualUrl("");
    setShowUrlInput(false);
    clearMessages();
  };

  const handleClear = () => { onChange(""); clearMessages(); };

  const previewSrc = value || "";
  const hasImage   = !!value;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold text-brand-navy mb-1">
          {label}{required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}

      {/* Preview */}
      {hasImage && (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="preview"
            className={`object-cover border border-gray-200 bg-brand-light ${compact ? "h-20 w-20" : "h-32 w-40"}`}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }}
          />
          <button
            type="button"
            onClick={handleClear}
            title="حذف الصورة"
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Upload button */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { clearMessages(); fileRef.current?.click(); }}
          disabled={uploading}
          className="flex items-center gap-2 bg-brand-navy text-white text-sm font-bold px-4 py-2 hover:bg-brand-gold transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> جاري الرفع...</>
          ) : (
            <><Upload className="h-4 w-4" /> {hasImage ? "تغيير الصورة" : "رفع صورة من الحاسوب"}</>
          )}
        </button>

        <button
          type="button"
          onClick={() => { setShowUrlInput(!showUrlInput); clearMessages(); }}
          className="flex items-center gap-1.5 text-xs text-brand-gray hover:text-brand-navy border border-gray-200 px-3 py-2 transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" />
          رابط يدوي
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Manual URL fallback */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="أو دخل رابط الصورة يدوياً..."
            className="flex-1 border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-navy"
            dir="ltr"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleManualSave())}
          />
          <button
            type="button"
            onClick={handleManualSave}
            className="bg-brand-navy text-white text-sm font-bold px-3 py-2 hover:bg-brand-gold transition-colors"
          >
            حفظ
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlInput(false); setManualUrl(""); }}
            className="text-brand-gray border border-gray-200 px-2 py-2 hover:border-brand-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      {successMsg && (
        <p className="flex items-center gap-1.5 text-xs text-green-700 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />{successMsg}
        </p>
      )}
      {errorMsg && (
        <p className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />{errorMsg}
        </p>
      )}

      {/* File hints */}
      {!compact && (
        <p className="text-[11px] text-brand-gray">
          JPG، PNG، WEBP — الحجم الأقصى 5MB
        </p>
      )}
    </div>
  );
}
