import { NextRequest, NextResponse } from "next/server";
import { getOpenWaiterCalls } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  if (!restaurantId) {
    return NextResponse.json({ requests: [] });
  }

  const calls = getOpenWaiterCalls(restaurantId);
  return NextResponse.json({
    requests: calls.map((c) => ({
      id: c.id,
      createdAt: c.createdAt,
      note: c.note,
      tableId: c.tableSlug,
      tableNumber: Number(c.tableSlug.split("-").pop()) || 0,
      qrSlug: c.tableSlug,
    })),
  });
}
