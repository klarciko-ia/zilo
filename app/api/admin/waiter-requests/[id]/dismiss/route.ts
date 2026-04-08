import { NextResponse } from "next/server";
import { dismissWaiterCall } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  dismissWaiterCall(params.id);
  return NextResponse.json({ ok: true });
}
