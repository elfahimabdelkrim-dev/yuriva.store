import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getWaNotifyStatus } = await import("@/lib/whatsapp-notify");
    const status = getWaNotifyStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err).slice(0, 200) }, { status: 500 });
  }
}
