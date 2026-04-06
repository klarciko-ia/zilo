import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import {
  getAllRestaurants,
  addRestaurant,
  type DemoRestaurant,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

type Tier = "self_service" | "waiter_service";
type Plan = "starter" | "growth" | "pro";

const PLAN_PRICE: Record<Plan, number> = {
  starter: 49,
  growth: 99,
  pro: 199,
};

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

export async function GET(req: NextRequest) {
  const auth = await requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { db } = auth;
  const statusFilter = req.nextUrl.searchParams.get("status");

  if (db) {
    try {
      let q = db
        .from("restaurants")
        .select("id, name, guest_order_mode, google_review_url, created_at")
        .order("created_at", { ascending: false });
      if (statusFilter === "active") q = q.eq("guest_order_mode", "self_service");
      if (statusFilter === "inactive") q = q.eq("guest_order_mode", "waiter_service");

      const { data: rows, error } = await q;
      if (!error && rows && rows.length > 0) {
        const restaurantIds = rows.map((r) => r.id as string);
        const openCountByRestaurant = new Map<string, number>();
        try {
          const { data: orders } = await db
            .from("table_orders")
            .select("restaurant_id, status")
            .in("restaurant_id", restaurantIds);
          for (const o of orders ?? []) {
            if ((o.status as string) === "paid") continue;
            const id = o.restaurant_id as string;
            openCountByRestaurant.set(id, (openCountByRestaurant.get(id) ?? 0) + 1);
          }
        } catch { /* ignore */ }

        const restaurants = rows.map((r) => {
          const tier = (r.guest_order_mode as Tier) ?? "self_service";
          return {
            id: r.id as string,
            name: (r.name as string) ?? "Unnamed",
            tier,
            status: tier === "waiter_service" ? "inactive" : "active",
            plan: "starter" as Plan,
            planPrice: PLAN_PRICE.starter,
            currency: "USD",
            paymentStatus:
              (openCountByRestaurant.get(r.id as string) ?? 0) > 0 ? "overdue" : "paid",
            createdAt: r.created_at as string,
          };
        });
        return NextResponse.json({ restaurants });
      }
    } catch { /* fall through */ }
  }

  let all = getAllRestaurants();
  if (statusFilter === "active") all = all.filter((r) => r.tier === "self_service");
  else if (statusFilter === "inactive") all = all.filter((r) => r.tier === "waiter_service");

  const restaurants = all.map((r) => ({
    id: r.id,
    name: r.name,
    tier: r.tier,
    status: r.status,
    plan: r.plan,
    planPrice: r.planPrice,
    currency: r.currency,
    paymentStatus: r.paymentStatus,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ restaurants });
}

export async function POST(req: NextRequest) {
  const auth = await requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { db } = auth;
  const body = (await req.json()) as {
    name?: string;
    tier?: Tier;
    currency?: string;
    plan?: Plan;
    numberOfTables?: number;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string;
    websiteUrl?: string | null;
    googleReviewUrl?: string | null;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
  }
  if (!body.tier || (body.tier !== "self_service" && body.tier !== "waiter_service")) {
    return NextResponse.json({ error: "Tier is required" }, { status: 400 });
  }
  if (!body.ownerEmail?.trim()) {
    return NextResponse.json({ error: "Owner email is required" }, { status: 400 });
  }

  const plan: Plan = body.plan === "growth" || body.plan === "pro" ? body.plan : "starter";
  const numberOfTables = Math.max(1, Math.min(200, body.numberOfTables || 5));

  if (db) {
    try {
      const { data: restaurant, error: restError } = await db
        .from("restaurants")
        .insert({
          name: body.name.trim(),
          guest_order_mode: body.tier,
          venue_flow: "dine_in",
          google_review_url: body.googleReviewUrl || "",
        })
        .select("id, name, guest_order_mode, google_review_url, created_at")
        .single();

      if (!restError && restaurant) {
        const restaurantId = restaurant.id as string;
        const slug = body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
        const tableInserts = Array.from({ length: numberOfTables }, (_, i) => ({
          restaurant_id: restaurantId,
          table_number: i + 1,
          qr_slug: `${slug}-${i + 1}`,
        }));
        await db.from("restaurant_tables").insert(tableInserts).then(
          () => undefined,
          () => undefined
        );
        await db
          .from("admin_users")
          .insert({
            restaurant_id: restaurantId,
            email: body.ownerEmail!.trim(),
            password_hash: "restaurant123",
            role: "restaurant_admin",
          })
          .then(() => undefined, () => undefined);

        return NextResponse.json({
          restaurant: {
            id: restaurantId,
            name: restaurant.name as string,
            tier: restaurant.guest_order_mode as Tier,
            status: (restaurant.guest_order_mode as Tier) === "waiter_service" ? "inactive" : "active",
            plan,
            planPrice: PLAN_PRICE[plan],
            currency: body.currency || "USD",
            paymentStatus: "paid",
            createdAt: restaurant.created_at as string,
          },
          tablesCreated: numberOfTables,
          adminEmail: body.ownerEmail!.trim(),
        }, { status: 201 });
      }
    } catch { /* fall through */ }
  }

  const newRestaurant: DemoRestaurant = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    tier: body.tier,
    status: body.tier === "waiter_service" ? "inactive" : "active",
    plan,
    planPrice: PLAN_PRICE[plan],
    currency: body.currency || "USD",
    paymentStatus: "paid",
    createdAt: new Date().toISOString(),
    ownerEmail: body.ownerEmail!.trim(),
    venueFlow: "dine_in",
    guestOrderMode: body.tier,
  };

  const { restaurant: saved, tables } = addRestaurant(newRestaurant, numberOfTables);

  return NextResponse.json({
    restaurant: {
      id: saved.id,
      name: saved.name,
      tier: saved.tier,
      status: saved.status,
      plan: saved.plan,
      planPrice: saved.planPrice,
      currency: saved.currency,
      paymentStatus: saved.paymentStatus,
      createdAt: saved.createdAt,
    },
    tablesCreated: tables.length,
    adminEmail: body.ownerEmail!.trim(),
  }, { status: 201 });
}
