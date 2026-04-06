import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import {
  getRestaurantById,
  getTablesByRestaurantId,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";

async function requireMaster(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");
  if (!adminId) return { error: "adminId required", status: 400 } as const;
  try {
    const db = getSupabase();
    const admin = await getAdminById(db, adminId);
    if (!admin) return { error: "Invalid admin", status: 401 } as const;
    if (admin.role !== "super_admin") return { error: "Forbidden", status: 403 } as const;
    return { db, adminId } as const;
  } catch {
    if (adminId === DEMO_OWNER_ID) return { db: null, adminId } as const;
    return { error: "Invalid admin", status: 401 } as const;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { db } = auth;
  const restaurantId = params.id;

  if (db) {
    try {
      const { data: rest } = await db
        .from("restaurants")
        .select("id, name, guest_order_mode, google_review_url, created_at, currency")
        .eq("id", restaurantId)
        .single();

      if (rest) {
        const { data: orders } = await db
          .from("table_orders")
          .select("id, total, status")
          .eq("restaurant_id", restaurantId);

        const allOrders = orders ?? [];
        const revenue = allOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
        const openOrders = allOrders.filter((o) => o.status !== "paid").length;
        const avgOrderValue = allOrders.length > 0 ? revenue / allOrders.length : 0;

        const { data: tables } = await db
          .from("restaurant_tables")
          .select("qr_slug, table_number")
          .eq("restaurant_id", restaurantId)
          .order("table_number");

        let ownerEmail: string | null = null;
        try {
          const { data: adminRow } = await db
            .from("admin_users")
            .select("email")
            .eq("restaurant_id", restaurantId)
            .limit(1)
            .single();
          ownerEmail = (adminRow?.email as string) ?? null;
        } catch { /* no admin row */ }

        return NextResponse.json({
          restaurant: {
            id: rest.id,
            name: rest.name,
            tier: rest.guest_order_mode,
            googleReviewUrl: rest.google_review_url,
            currency: (rest.currency as string) ?? "USD",
            status: (rest.guest_order_mode as string) === "waiter_service" ? "inactive" : "active",
            plan: "starter",
            planPrice: 49,
            createdAt: rest.created_at as string,
            ownerEmail,
          },
          overview: { revenue, totalOrders: allOrders.length, openOrders, avgOrderValue },
          billing: { cashPending: 0, paymentStatus: "paid" },
          operations: { openWaiterCalls: 0, kitchenTicketsOpen: 0 },
          tables: (tables ?? []).map((t: Record<string, unknown>) => ({
            slug: t.qr_slug as string,
            tableNumber: t.table_number as number,
          })),
        });
      }
    } catch { /* fall through */ }
  }

  const restaurant = getRestaurantById(restaurantId);
  const tables = getTablesByRestaurantId(restaurantId);

  if (restaurant) {
    return NextResponse.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        tier: restaurant.tier,
        googleReviewUrl: null,
        currency: restaurant.currency ?? "USD",
        status: restaurant.status ?? "active",
        plan: restaurant.plan ?? "starter",
        planPrice: restaurant.planPrice ?? 49,
        createdAt: restaurant.createdAt,
        ownerEmail: restaurant.ownerEmail ?? null,
      },
      overview: { revenue: 0, totalOrders: 0, openOrders: 0, avgOrderValue: 0 },
      billing: { cashPending: 0, paymentStatus: restaurant.paymentStatus },
      operations: { openWaiterCalls: 0, kitchenTicketsOpen: 0 },
      tables: tables.map((t) => ({ slug: t.slug, tableNumber: t.tableNumber })),
    });
  }

  return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
}

