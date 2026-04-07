import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import { canTransition } from "@/lib/order-lifecycle";
import { updateDemoOrderStatus, getOrderById as getDemoOrder } from "@/lib/demo-order-store";
import type { OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "awaiting_payment",
  "pending_cash",
  "paid",
];

const DEMO_STAFF_ID = "55555555-5555-5555-5555-555555555551";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orderId } = await params;

  let body: { status?: string; adminId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { status: newStatusRaw, adminId } = body;

  if (!adminId || !newStatusRaw) {
    return NextResponse.json(
      { error: "status and adminId are required" },
      { status: 400 },
    );
  }

  if (!VALID_STATUSES.includes(newStatusRaw as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const newStatus = newStatusRaw as OrderStatus;

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
      const { data: order, error: orderErr } = await db
        .from("table_orders")
        .select("id, status, table_id")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr || !order) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 },
        );
      }

      const currentStatus = order.status as OrderStatus;

      if (!canTransition(currentStatus, newStatus)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${currentStatus} to ${newStatus}`,
          },
          { status: 422 },
        );
      }

      const { data: table } = await db
        .from("restaurant_tables")
        .select("restaurant_id")
        .eq("id", order.table_id as string)
        .maybeSingle();

      if (
        admin.role !== "super_admin" &&
        admin.restaurantId !== (table?.restaurant_id as string | null)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { error: updateErr } = await db
        .from("table_orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (updateErr) {
        return NextResponse.json(
          { error: "Failed to update order" },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, orderId, newStatus });
    } catch {
      /* fall through to demo */
    }
  }

  const demoOrder = getDemoOrder(orderId);
  if (demoOrder) {
    if (!canTransition(demoOrder.status, newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${demoOrder.status} to ${newStatus}` },
        { status: 422 },
      );
    }
    updateDemoOrderStatus(orderId, newStatus);
  }

  return NextResponse.json({ ok: true, orderId, newStatus });
}
