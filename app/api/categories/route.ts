import { NextResponse } from "next/server";
import { sampleCategories } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    categories: sampleCategories.map((c) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sortOrder,
    })),
  });
}
