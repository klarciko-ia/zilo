import { NextRequest, NextResponse } from "next/server";
import {
  setItemAvailability,
  getCredentialsByRestaurantId,
  getAllRestaurants,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

function resolveDemoAdmin(adminId: string) {
  for (const r of getAllRestaurants()) {
    const creds = getCredentialsByRestaurantId(r.id);
    const match = creds.find((c) => c.adminId === adminId);
    if (match) {
      return {
        id: match.adminId,
        email: match.email,
        restaurantId: match.restaurantId,
        role: match.role as "restaurant_admin" | "restaurant_staff",
      };
    }
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: itemId } = await params;
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!adminId) {
    return NextResponse.json(
      { error: "adminId is required" },
      { status: 400 },
    );
  }

  let body: { isAvailable?: boolean };
  try {
    body = (await req.json()) as { isAvailable?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.isAvailable !== "boolean") {
    return NextResponse.json(
      { error: "isAvailable (boolean) is required" },
      { status: 400 },
    );
  }

  const admin = resolveDemoAdmin(adminId);

  if (!admin || !admin.restaurantId) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  setItemAvailability(admin.restaurantId, itemId, body.isAvailable);

  return NextResponse.json({
    ok: true,
    itemId,
    isAvailable: body.isAvailable,
  });
}
