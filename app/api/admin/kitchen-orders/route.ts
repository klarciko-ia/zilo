import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import { restaurantFilterForAdmin } from "@/lib/admin-api-scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json({ orders: [] });
  }

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
    .from("kitchen_orders")
    .select("id, status, created_at, updated_at, table_id, restaurant_id")
    .in("status", ["new", "preparing", "ready"])
    .order("created_at", { ascending: false });

  if (restaurantFilter) {
    q = q.eq("restaurant_id", restaurantFilter);
  }

  const { data: rows, error } = await q;

  if (error) {
    return NextResponse.json({
      orders: [],
      error: error.message,
      hint:
        error.message.includes("kitchen_orders") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
          ? "Run supabase/migrations/0003_kitchen_orders.sql."
          : undefined,
    });
  }

  const list = rows ?? [];
  const tableIds = [...new Set(list.map((r) => r.table_id as string))];

  let tableMap = new Map<
    string,
    { table_number: number; qr_slug: string }
  >();
  if (tableIds.length > 0) {
    const { data: tables, error: tablesErr } = await db
      .from("restaurant_tables")
      .select("id, table_number, qr_slug")
      .in("id", tableIds);
    if (!tablesErr && tables) {
      tableMap = new Map(
        tables.map((t) => [
          t.id as string,
          {
            table_number: Number(t.table_number),
            qr_slug: t.qr_slug as string,
          },
        ])
      );
    }
  }

  const orderIds = list.map((r) => r.id as string);
  const itemsByKitchen = new Map<
    string,
    Array<{
      id: string;
      name: string;
      unitPrice: number;
      quantity: number;
      menuItemId: string | null;
    }>
  >();

  if (orderIds.length > 0) {
    const { data: itemRows, error: itemsErr } = await db
      .from("kitchen_order_items")
      .select("id, kitchen_order_id, name, unit_price, quantity, menu_item_id")
      .in("kitchen_order_id", orderIds);

    if (!itemsErr && itemRows) {
      for (const it of itemRows) {
        const kid = it.kitchen_order_id as string;
        const arr = itemsByKitchen.get(kid) ?? [];
        arr.push({
          id: it.id as string,
          name: it.name as string,
          unitPrice: Number(it.unit_price),
          quantity: it.quantity as number,
          menuItemId: (it.menu_item_id as string | null) ?? null,
        });
        itemsByKitchen.set(kid, arr);
      }
    }
  }

  const orders = list.map((r) => {
    const t = tableMap.get(r.table_id as string);
    return {
      id: r.id as string,
      status: r.status as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      tableId: r.table_id as string,
      tableNumber: t?.table_number ?? null,
      qrSlug: t?.qr_slug ?? null,
      items: itemsByKitchen.get(r.id as string) ?? [],
    };
  });

  return NextResponse.json({ orders });
}
