import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/google-sheets/repair
 * Detect shifted rows (rows where order data starts from the wrong column).
 *
 * POST /api/admin/google-sheets/repair
 * Repair shifted rows by moving data back to column A.
 */

export async function GET(_req: NextRequest) {
  try {
    const { detectShiftedRows } = await import("@/lib/google-sheets");
    const result = await detectShiftedRows();

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success:     true,
      sheetTitle:  result.sheetTitle,
      shiftedRows: result.shiftedRows,
      count:       result.shiftedRows.length,
      message:     result.shiftedRows.length === 0
        ? "لا توجد صفوف منحرفة — الورقة بخير"
        : `تم الكشف عن ${result.shiftedRows.length} صف منحرف`,
    });
  } catch (err) {
    console.error("[Repair API] detect error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const { repairShiftedRows } = await import("@/lib/google-sheets");
    const result = await repairShiftedRows();

    return NextResponse.json({
      success:  result.ok,
      repaired: result.repaired,
      skipped:  result.skipped,
      errors:   result.errors,
      message:  result.repaired === 0
        ? "لا توجد صفوف تحتاج إصلاح"
        : `تم إصلاح ${result.repaired} صف بنجاح`,
    });
  } catch (err) {
    console.error("[Repair API] repair error:", String(err).slice(0, 200));
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}
