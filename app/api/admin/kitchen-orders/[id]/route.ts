import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ id: params.id, status: "done" });
}
