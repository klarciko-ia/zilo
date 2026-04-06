import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let adminId: string | undefined;
  try {
    const body = (await req.json()) as { adminId?: string };
    adminId = body.adminId;
  } catch {
    adminId = undefined;
  }
  if (!adminId) {
    return NextResponse.json({ error: "adminId required" }, { status: 400 });
  }

  const admin = await getAdminById(db, adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  const { data: row, error: fetchErr } = await db
    .from("waiter_requests")
    .select("id, restaurant_id")
    .eq("id", id)
    .eq("status", "open")
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { error: "Not found or already dismissed" },
      { status: 404 }
    );
  }

  if (
    admin.role === "restaurant_admin" &&
    admin.restaurantId &&
    row.restaurant_id !== admin.restaurantId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await db
    .from("waiter_requests")
    .update({
      status: "dismissed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found or already dismissed" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
