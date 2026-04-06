import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import { restaurantFilterForAdmin } from "@/lib/admin-api-scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const db = getSupabase();
  const adminId = req.nextUrl.searchParams.get("adminId");
  const restaurantIdParam = req.nextUrl.searchParams.get("restaurantId");

  let restaurantFilter: string | null = null;
  if (adminId) {
    const admin = await getAdminById(db, adminId);
    if (!admin) {
      return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
    }
    restaurantFilter = restaurantFilterForAdmin(admin, restaurantIdParam);
  }

  let q = db
    .from("restaurant_tables")
    .select("id, table_number, qr_slug, restaurant_id, restaurants(id, name)")
    .order("table_number");

  if (restaurantFilter) {
    q = q.eq("restaurant_id", restaurantFilter);
  }

  const { data: tables } = await q;

  if (!tables?.length) {
    return NextResponse.json({ tables: [] });
  }

  const tableIds = tables.map((t: Record<string, unknown>) => t.id);

  const { data: orders } = await db
    .from("table_orders")
    .select("*, order_items(*), payments(*)")
    .in("table_id", tableIds)
    .neq("status", "paid")
    .order("created_at", { ascending: false });

  const latestByTable = new Map<string, Record<string, unknown>>();
  for (const o of orders ?? []) {
    if (!latestByTable.has(o.table_id as string)) {
      latestByTable.set(o.table_id as string, o);
    }
  }

  const result = tables.map((t: Record<string, unknown>) => {
    const order = latestByTable.get(t.id as string);
    return {
      id: t.id,
      tableNumber: t.table_number,
      qrSlug: t.qr_slug,
      restaurant: t.restaurants,
      order: order
        ? {
            id: order.id,
            status: order.status,
            totalAmount: Number(order.total_amount),
            amountPaid: Number(order.amount_paid),
            amountCashPending: Number(order.amount_cash_pending),
            remainingAmount: Number(order.remaining_amount),
            orderItems: ((order.order_items as Record<string, unknown>[]) ?? []).map(
              (oi) => ({
                id: oi.id,
                menuItemId: oi.menu_item_id,
                name: oi.name,
                unitPrice: Number(oi.unit_price),
                quantityTotal: oi.quantity_total,
                quantityPaid: oi.quantity_paid,
                quantityRemaining: oi.quantity_remaining,
              })
            ),
            payments: ((order.payments as Record<string, unknown>[]) ?? []).map(
              (p) => ({
                id: p.id,
                amount: Number(p.amount),
                paymentMethod: p.payment_method,
                paymentType: p.payment_type,
                status: p.status,
                createdAt: p.created_at,
              })
            ),
          }
        : null,
    };
  });

  return NextResponse.json({ tables: result });
}
