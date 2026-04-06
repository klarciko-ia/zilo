import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const MODES = ["self_service", "waiter_service"] as const;

function normalizeRestaurant(row: Record<string, unknown>) {
  const g = row.guest_order_mode;
  const guestOrderMode =
    g === "waiter_service" || g === "self_service" ? g : "self_service";
  const v = row.venue_flow;
  const venueFlow = v === "pay_first" || v === "dine_in" ? v : "dine_in";
  return {
    restaurantId: row.id as string,
    name: row.name as string,
    guestOrderMode,
    venueFlow,
  };
}

/** GET ?adminId=uuid — super_admin: all restaurants + canEditTier. restaurant_admin: own venue, read-only tier. */
export async function GET(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");

  try {
    const db = getSupabase();

    if (!adminId) {
      const { data: row, error } = await db
        .from("restaurants")
        .select("id, name, guest_order_mode, venue_flow")
        .order("created_at")
        .limit(1)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!row) {
        return NextResponse.json({
          canEditTier: false,
          restaurants: [],
          viewerRole: "unknown",
        });
      }
      const n = normalizeRestaurant(row as Record<string, unknown>);
      return NextResponse.json({
        canEditTier: false,
        restaurants: [n],
        viewerRole: "unknown",
        ...n,
      });
    }

    const admin = await getAdminById(db, adminId);
    if (!admin) {
      return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
    }

    if (admin.role === "super_admin") {
      const { data: rows, error } = await db
        .from("restaurants")
        .select("id, name, guest_order_mode, venue_flow")
        .order("name");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        canEditTier: true,
        restaurants: (rows ?? []).map((r) =>
          normalizeRestaurant(r as Record<string, unknown>)
        ),
        viewerRole: "super_admin",
      });
    }

    if (!admin.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant admin has no venue scope" },
        { status: 403 }
      );
    }

    const { data: row, error } = await db
      .from("restaurants")
      .select("id, name, guest_order_mode, venue_flow")
      .eq("id", admin.restaurantId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const n = normalizeRestaurant(row as Record<string, unknown>);
    return NextResponse.json({
      canEditTier: false,
      restaurants: [n],
      viewerRole: "restaurant_admin",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Only super_admin may change guest_order_mode. */
export async function PATCH(req: NextRequest) {
  try {
    const db = getSupabase();
    const body = (await req.json()) as {
      guestOrderMode?: string;
      restaurantId?: string;
      adminId?: string;
    };

    const mode = body.guestOrderMode;
    if (!mode || !MODES.includes(mode as (typeof MODES)[number])) {
      return NextResponse.json(
        { error: "guestOrderMode must be self_service or waiter_service" },
        { status: 400 }
      );
    }

    if (!body.adminId) {
      return NextResponse.json(
        { error: "adminId required" },
        { status: 400 }
      );
    }

    const admin = await getAdminById(db, body.adminId);
    if (!admin || admin.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only company owner can change ordering tier" },
        { status: 403 }
      );
    }

    let restaurantId = body.restaurantId;
    if (!restaurantId) {
      const { data: first, error: pickErr } = await db
        .from("restaurants")
        .select("id")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      if (pickErr) {
        return NextResponse.json({ error: pickErr.message }, { status: 500 });
      }
      if (!first) {
        return NextResponse.json(
          { error: "No restaurant row to update" },
          { status: 404 }
        );
      }
      restaurantId = first.id as string;
    }

    const { error } = await db
      .from("restaurants")
      .update({ guest_order_mode: mode })
      .eq("id", restaurantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      restaurantId,
      guestOrderMode: mode,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
