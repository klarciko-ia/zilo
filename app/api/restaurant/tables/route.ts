import { NextRequest, NextResponse } from "next/server";
import {
  getTablesByRestaurantId,
  getRestaurantById,
  getCredentialsByRestaurantId,
  getAllRestaurants,
} from "@/lib/demo-store";
import {
  getOrdersByRestaurantId,
  getOpenWaiterCalls,
  getRestaurantStats,
  getAllOrdersByRestaurantId,
  computePaymentSummary,
} from "@/lib/demo-order-store";

export const dynamic = "force-dynamic";

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";

function resolveDemoAdmin(adminId: string) {
  if (adminId === DEMO_OWNER_ID) {
    return { id: DEMO_OWNER_ID, email: "owner@zilo.ma", restaurantId: null as string | null, role: "super_admin" as const };
  }
  for (const r of getAllRestaurants()) {
    const creds = getCredentialsByRestaurantId(r.id);
    const match = creds.find((c) => c.adminId === adminId);
    if (match) {
      return {
        id: match.adminId,
        email: match.email,
        restaurantId: match.restaurantId as string | null,
        role: match.role as "restaurant_admin" | "restaurant_staff",
      };
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!restaurantId || !adminId) {
    return NextResponse.json(
      { error: "restaurantId and adminId are required" },
      { status: 400 },
    );
  }

  const admin = resolveDemoAdmin(adminId);

  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  if (admin.role !== "super_admin" && admin.restaurantId !== restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const demoTables = getTablesByRestaurantId(restaurantId);
  const demoRestaurant = getRestaurantById(restaurantId);
  const demoOrders = getOrdersByRestaurantId(restaurantId);

  const orderBySlug = new Map(demoOrders.map((o) => [o.tableSlug, o]));

  const tables = demoTables.map((t) => {
    const demoOrder = orderBySlug.get(t.slug);
    if (!demoOrder) {
      return { id: t.slug, tableNumber: t.tableNumber, qrSlug: t.slug, order: null };
    }

    const summary = computePaymentSummary(demoOrder);

    return {
      id: t.slug,
      tableNumber: t.tableNumber,
      qrSlug: t.slug,
      order: {
        id: demoOrder.id,
        status: demoOrder.status,
        total: demoOrder.total,
        createdAt: demoOrder.createdAt,
        items: demoOrder.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        payments: demoOrder.payments.map((p) => ({
          id: p.id,
          method: p.method,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        })),
        confirmedPaid: summary.totalConfirmed,
        pendingCash: summary.pendingCash,
        remainingToClaim: summary.remainingToClaim,
      },
    };
  });

  const waiterCalls = getOpenWaiterCalls(restaurantId);
  const stats = getRestaurantStats(restaurantId);
  const allOrders = getAllOrdersByRestaurantId(restaurantId);

  return NextResponse.json({
    tables,
    restaurant: {
      name: demoRestaurant?.name ?? "Restaurant",
      currency: demoRestaurant?.currency ?? "USD",
      guestOrderMode: demoRestaurant?.guestOrderMode ?? "waiter_service",
    },
    waiterCalls: waiterCalls.map((c) => ({
      id: c.id,
      tableSlug: c.tableSlug,
      note: c.note,
      createdAt: c.createdAt,
    })),
    stats,
    orderHistory: allOrders
      .filter((o) => o.status === "paid")
      .slice(-50)
      .reverse()
      .map((o) => ({
        id: o.id,
        tableSlug: o.tableSlug,
        total: o.total,
        itemCount: o.items.length,
        createdAt: o.createdAt,
      })),
  });
}
