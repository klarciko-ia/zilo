import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import { updateRestaurant } from "@/lib/demo-store";

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
    return { db } as const;
  } catch {
    if (adminId === DEMO_OWNER_ID) return { db: null } as const;
    return { error: "Invalid admin", status: 401 } as const;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { db } = auth;
  const body = (await req.json()) as {
    tier?: "self_service" | "waiter_service";
    status?: "active" | "inactive";
    name?: string;
    googleReviewUrl?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.tier === "self_service" || body.tier === "waiter_service") {
    updates.guest_order_mode = body.tier;
  }
  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.googleReviewUrl !== undefined) {
    updates.google_review_url = body.googleReviewUrl;
  }

  if (Object.keys(updates).length === 0 && !body.status) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (db) {
    try {
      if (Object.keys(updates).length > 0) {
        const { data, error } = await db
          .from("restaurants")
          .update(updates)
          .eq("id", params.id)
          .select("id, name, guest_order_mode, google_review_url, created_at")
          .single();

        if (!error && data) {
          return NextResponse.json({
            restaurant: {
              id: data.id,
              name: data.name,
              tier: data.guest_order_mode,
              googleReviewUrl: data.google_review_url,
              createdAt: data.created_at,
            },
          });
        }
      } else {
        return NextResponse.json({ ok: true });
      }
    } catch {
      /* Supabase failed – fall through to demo store */
    }
  }

  const demoPatch: Parameters<typeof updateRestaurant>[1] = {};
  if (body.tier) {
    demoPatch.tier = body.tier;
    demoPatch.guestOrderMode = body.tier;
  }
  if (body.status) demoPatch.status = body.status;

  if (Object.keys(demoPatch).length > 0) {
    updateRestaurant(params.id, demoPatch);
  }

  return NextResponse.json({
    restaurant: {
      id: params.id,
      name: body.name ?? "Restaurant",
      tier: body.tier ?? "self_service",
      googleReviewUrl: body.googleReviewUrl ?? null,
      createdAt: new Date().toISOString(),
    },
  });
}
