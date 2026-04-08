import { NextRequest, NextResponse } from "next/server";
import { updateRestaurant } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";

function requireMaster(req: NextRequest) {
  const adminId = req.nextUrl.searchParams.get("adminId");
  if (!adminId) return { error: "adminId required", status: 400 } as const;
  if (adminId === DEMO_OWNER_ID) return { adminId } as const;
  return { error: "Invalid admin", status: 401 } as const;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireMaster(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
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
