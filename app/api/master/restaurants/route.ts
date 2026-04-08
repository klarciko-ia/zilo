import { NextRequest, NextResponse } from "next/server";
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

function requireMaster(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");
  if (!adminId) return { error: "adminId required", status: 400 } as const;
  if (adminId === DEMO_OWNER_ID) return { adminId } as const;
  return { error: "Invalid admin", status: 401 } as const;
}

export async function GET(req: NextRequest) {
  const auth = requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const statusFilter = req.nextUrl.searchParams.get("status");

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
  const auth = requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
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
