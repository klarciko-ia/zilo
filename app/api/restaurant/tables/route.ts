import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import {
  getTablesByRestaurantId,
  getRestaurantById,
} from "@/lib/demo-store";
import { getOrdersByRestaurantId } from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

const DEMO_STAFF_ID = "55555555-5555-5555-5555-555555555551";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!restaurantId || !adminId) {
    return NextResponse.json(
      { error: "restaurantId and adminId are required" },
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

  if (
    admin.role !== "super_admin" &&
    admin.restaurantId !== restaurantId
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (db) {
    try {
      const { data: tables, error: tablesErr } = await db
        .from("restaurant_tables")
        .select("id, table_number, qr_slug")
        .eq("restaurant_id", restaurantId)
        .order("table_number");

      if (!tablesErr && tables && tables.length > 0) {
        const tableIds = tables.map((t) => t.id as string);

        const { data: orders } = await db
          .from("table_orders")
          .select("id, table_id, status, total_amount, created_at")
          .in("table_id", tableIds)
          .neq("status", "paid");

        const orderMap = new Map<string, typeof orders extends (infer U)[] | null ? U : never>();
        for (const o of orders ?? []) {
          orderMap.set(o.table_id as string, o);
        }

        const orderIds = (orders ?? []).map((o) => o.id as string);
        const itemMap = new Map<string, { name: string; quantity: number; unitPrice: number }[]>();

        if (orderIds.length > 0) {
          const { data: items } = await db
            .from("order_items")
            .select("order_id, name, quantity, unit_price")
            .in("order_id", orderIds);

          for (const item of items ?? []) {
            const oid = item.order_id as string;
            if (!itemMap.has(oid)) itemMap.set(oid, []);
            itemMap.get(oid)!.push({
              name: item.name as string,
              quantity: item.quantity as number,
              unitPrice: item.unit_price as number,
            });
          }
        }

        const { data: rest } = await db
          .from("restaurants")
          .select("name, currency")
          .eq("id", restaurantId)
          .maybeSingle();

        const result = tables.map((t) => {
          const order = orderMap.get(t.id as string);
          return {
            id: t.id as string,
            tableNumber: t.table_number as number,
            qrSlug: t.qr_slug as string,
            order: order
              ? {
                  id: order.id as string,
                  status: order.status as string,
                  total: (order.total_amount as number) ?? 0,
                  createdAt: order.created_at as string,
                  items: itemMap.get(order.id as string) ?? [],
                }
              : null,
          };
        });

        return NextResponse.json({
          tables: result,
          restaurant: {
            name: (rest?.name as string) ?? "Restaurant",
            currency: (rest?.currency as string) ?? "USD",
          },
        });
      }
    } catch {
      /* fall through to demo */
    }
  }

  const demoTables = getTablesByRestaurantId(restaurantId);
  const demoRestaurant = getRestaurantById(restaurantId);
  const demoOrders = getOrdersByRestaurantId(restaurantId);

  const orderBySlug = new Map(demoOrders.map((o) => [o.tableSlug, o]));

  const tables = demoTables.map((t) => {
    const demoOrder = orderBySlug.get(t.slug);
    return {
      id: t.slug,
      tableNumber: t.tableNumber,
      qrSlug: t.slug,
      order: demoOrder
        ? {
            id: demoOrder.id,
            status: demoOrder.status,
            total: demoOrder.total,
            createdAt: demoOrder.createdAt,
            items: demoOrder.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          }
        : null,
    };
  });

  return NextResponse.json({
    tables,
    restaurant: {
      name: demoRestaurant?.name ?? "Restaurant",
      currency: demoRestaurant?.currency ?? "USD",
    },
  });
}
