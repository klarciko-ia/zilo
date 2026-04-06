import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const DEMO_STAFF_ID = "55555555-5555-5555-5555-555555555551";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: itemId } = await params;
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!adminId) {
    return NextResponse.json(
      { error: "adminId is required" },
      { status: 400 },
    );
  }

  let body: { isAvailable?: boolean };
  try {
    body = (await req.json()) as { isAvailable?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isAvailable !== "boolean") {
    return NextResponse.json(
      { error: "isAvailable (boolean) is required" },
      { status: 400 },
    );
  }

  let admin;
  let db;
  try {
    db = getSupabase();
    admin = await getAdminById(db, adminId);
  } catch {
    admin =
      adminId === DEMO_STAFF_ID
        ? {
            id: DEMO_STAFF_ID,
            email: "admin@zilo.ma",
            restaurantId: "11111111-1111-1111-1111-111111111111",
            role: "restaurant_admin" as const,
          }
        : null;
    db = null;
  }

  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  if (db) {
    try {
      const { error } = await db
        .from("menu_items")
        .update({ is_available: body.isAvailable })
        .eq("id", itemId);

      if (error) {
        return NextResponse.json(
          { error: "Failed to update item" },
          { status: 500 },
        );
      }
    } catch {
      /* demo fallback — no persistent store */
    }
  }

  return NextResponse.json({
    ok: true,
    itemId,
    isAvailable: body.isAvailable,
  });
}
