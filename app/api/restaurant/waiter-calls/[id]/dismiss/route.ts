import { NextRequest, NextResponse } from "next/server";
import { dismissWaiterCall } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dismissed = dismissWaiterCall(params.id);
  if (!dismissed) {
    return NextResponse.json({ error: "Call not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
