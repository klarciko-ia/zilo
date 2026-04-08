import { NextRequest, NextResponse } from "next/server";
import { resolveAdminDemoOnly } from "@/lib/admin-server";
import {
  getRestaurantById,
  getTablesByRestaurantId,
  getCredentialsByRestaurantId,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

function requireMaster(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");
  if (!adminId) return { error: "adminId required", status: 400 } as const;
  const admin = resolveAdminDemoOnly(adminId);
  if (!admin) return { error: "Invalid admin", status: 401 } as const;
  if (admin.role !== "super_admin")
    return { error: "Forbidden", status: 403 } as const;
  return { adminId } as const;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const restaurantId = params.id;
  const restaurant = getRestaurantById(restaurantId);
  const tables = getTablesByRestaurantId(restaurantId);

  if (restaurant) {
    const creds = getCredentialsByRestaurantId(restaurantId);

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
      credentials: creds.map((c) => ({
        adminId: c.adminId,
        email: c.email,
        password: c.password,
        role: c.role,
        label: c.label,
      })),
    });
  }

  return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
}
