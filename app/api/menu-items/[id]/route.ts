import { NextRequest, NextResponse } from "next/server";
import { sampleMenuItems } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const item = sampleMenuItems.find((i) => i.id === params.id);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
