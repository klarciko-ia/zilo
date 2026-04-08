import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug } from "@/lib/demo-store";
import { createWaiterCall } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

const NOTE_MAX = 200;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let note: string | null = null;
  try {
    const body = (await req.json()) as { note?: string };
    if (typeof body.note === "string" && body.note.trim()) {
      note = body.note.trim().slice(0, NOTE_MAX);
    }
  } catch {
    /* empty body ok */
  }

  return demoSuccess(params.id, note);
}

function demoSuccess(tableSlug: string, note: string | null) {
  const tableHit = getTableBySlug(tableSlug);
  const restaurantId = tableHit?.restaurantId ?? "unknown";
  const call = createWaiterCall(tableSlug, restaurantId, note);
  return NextResponse.json({
    id: call.id,
    deduped: call.createdAt !== new Date().toISOString(),
    note,
  });
}
