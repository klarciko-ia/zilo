import { NextRequest, NextResponse } from "next/server";
import { sampleCategories } from "@/lib/seed-data";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cat = sampleCategories.find((c) => c.id === params.id);
  if (!cat) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  return NextResponse.json({
    category: { id: cat.id, name: cat.name, sortOrder: cat.sortOrder },
  });
}
