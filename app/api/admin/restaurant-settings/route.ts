import { NextRequest, NextResponse } from "next/server";
import {
  getAllRestaurants,
  getRestaurantById,
  updateRestaurant,
  getCredentialsByRestaurantId,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const MODES = ["self_service", "waiter_service"] as const;

function resolveDemoAdmin(adminId: string) {
  for (const r of getAllRestaurants()) {
    const creds = getCredentialsByRestaurantId(r.id);
    const match = creds.find((c) => c.adminId === adminId);
    if (match) return { id: match.adminId, email: match.email, restaurantId: match.restaurantId, role: match.role };
  }
  return null;
}

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";

function resolveAdmin(adminId: string) {
  if (adminId === DEMO_OWNER_ID) {
    return { id: DEMO_OWNER_ID, email: "owner@zilo.ma", restaurantId: null as string | null, role: "super_admin" };
  }
  return resolveDemoAdmin(adminId);
}

export async function GET(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!adminId) {
    const restaurants = getAllRestaurants();
    if (restaurants.length === 0) {
      return NextResponse.json({ canEditTier: false, restaurants: [], viewerRole: "unknown" });
    }
    const r = restaurants[0];
    const n = { restaurantId: r.id, name: r.name, guestOrderMode: r.guestOrderMode, venueFlow: r.venueFlow };
    return NextResponse.json({ canEditTier: false, restaurants: [n], viewerRole: "unknown", ...n });
  }

  const admin = resolveAdmin(adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  if (admin.role === "super_admin") {
    const all = getAllRestaurants();
    return NextResponse.json({
      canEditTier: true,
      restaurants: all.map((r) => ({
        restaurantId: r.id,
        name: r.name,
        guestOrderMode: r.guestOrderMode,
        venueFlow: r.venueFlow,
      })),
      viewerRole: "super_admin",
    });
  }

  if (!admin.restaurantId) {
    return NextResponse.json({ error: "No venue scope" }, { status: 403 });
  }

  const r = getRestaurantById(admin.restaurantId);
  if (!r) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  const n = { restaurantId: r.id, name: r.name, guestOrderMode: r.guestOrderMode, venueFlow: r.venueFlow };
  return NextResponse.json({ canEditTier: false, restaurants: [n], viewerRole: "restaurant_admin" });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    guestOrderMode?: string;
    restaurantId?: string;
    adminId?: string;
  };

  const mode = body.guestOrderMode;
  if (!mode || !MODES.includes(mode as (typeof MODES)[number])) {
    return NextResponse.json({ error: "guestOrderMode must be self_service or waiter_service" }, { status: 400 });
  }

  if (!body.adminId) {
    return NextResponse.json({ error: "adminId required" }, { status: 400 });
  }

  const admin = resolveAdmin(body.adminId);
  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Only company owner can change ordering tier" }, { status: 403 });
  }

  let restaurantId = body.restaurantId;
  if (!restaurantId) {
    const all = getAllRestaurants();
    if (all.length === 0) return NextResponse.json({ error: "No restaurant" }, { status: 404 });
    restaurantId = all[0].id;
  }

  updateRestaurant(restaurantId, { guestOrderMode: mode as "self_service" | "waiter_service" });

  return NextResponse.json({ ok: true, restaurantId, guestOrderMode: mode });
}
