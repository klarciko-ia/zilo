import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["new", "preparing", "ready", "done"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  let body: { status?: string; adminId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status;
  if (!status || !ALLOWED.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!body.adminId) {
    return NextResponse.json({ error: "adminId required" }, { status: 400 });
  }

  const admin = await getAdminById(db, body.adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  const { data: ticket, error: ticketErr } = await db
    .from("kitchen_orders")
    .select("id, restaurant_id")
    .eq("id", params.id)
    .maybeSingle();

  if (ticketErr) {
    return NextResponse.json({ error: ticketErr.message }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (
    admin.role === "restaurant_admin" &&
    admin.restaurantId &&
    ticket.restaurant_id !== admin.restaurantId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await db
    .from("kitchen_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, status: data.status });
}
