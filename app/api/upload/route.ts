import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest) {
  return NextResponse.json({
    url: `/placeholder-image.jpg`,
    message: "Upload not available in demo mode",
  });
}
