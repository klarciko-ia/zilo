import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();

  const { data: table } = await db
    .from("restaurant_tables")
    .select("id")
    .eq("qr_slug", params.id)
    .single();

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const { data: order } = await db
    .from("table_orders")
    .select("*, order_items(*), payments(*)")
    .eq("table_id", table.id)
    .neq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ order: null });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      tableId: params.id,
      status: order.status,
      totalAmount: Number(order.total_amount),
      amountPaid: Number(order.amount_paid),
      amountCashPending: Number(order.amount_cash_pending),
      remainingAmount: Number(order.remaining_amount),
      orderItems: (order.order_items ?? []).map((oi: Record<string, unknown>) => ({
        id: oi.id,
        menuItemId: oi.menu_item_id,
        name: oi.name,
        unitPrice: Number(oi.unit_price),
        quantityTotal: oi.quantity_total,
        quantityPaid: oi.quantity_paid,
        quantityRemaining: oi.quantity_remaining,
      })),
      payments: (order.payments ?? []).map((p: Record<string, unknown>) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.payment_method,
        paymentType: p.payment_type,
        status: p.status,
        createdAt: p.created_at,
      })),
      updatedAt: order.updated_at,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const body = await req.json();
  const { items } = body as {
    items: Array<{ menuItemId: string; name: string; unitPrice: number; quantity: number }>;
  };

  if (!items?.length) {
    return NextResponse.json({ error: "Items required" }, { status: 400 });
  }

  const { data: table } = await db
    .from("restaurant_tables")
    .select("id, restaurant_id")
    .eq("qr_slug", params.id)
    .single();

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const totalAmount = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const { data: order, error: orderErr } = await db
    .from("table_orders")
    .insert({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      status: "unpaid",
      total_amount: totalAmount,
      amount_paid: 0,
      amount_cash_pending: 0,
      remaining_amount: totalAmount,
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  const orderItemRows = items.map((i) => ({
    order_id: order.id,
    menu_item_id: i.menuItemId,
    name: i.name,
    unit_price: i.unitPrice,
    quantity_total: i.quantity,
    quantity_paid: 0,
    quantity_remaining: i.quantity,
    total_price: i.unitPrice * i.quantity,
  }));

  await db.from("order_items").insert(orderItemRows);

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
