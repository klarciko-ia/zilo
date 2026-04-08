import { NextRequest, NextResponse } from "next/server";
import {
  getCredentialsByRestaurantId,
  getAllRestaurants,
  addCredential,
} from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";

function resolveDemoAdmin(adminId: string) {
  if (adminId === DEMO_OWNER_ID) {
    return { id: DEMO_OWNER_ID, role: "super_admin", restaurantId: null as string | null };
  }
  for (const r of getAllRestaurants()) {
    const creds = getCredentialsByRestaurantId(r.id);
    const match = creds.find((c) => c.adminId === adminId);
    if (match) return { id: match.adminId, role: match.role, restaurantId: match.restaurantId };
  }
  return null;
}

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!restaurantId || !adminId) {
    return NextResponse.json({ error: "restaurantId and adminId are required" }, { status: 400 });
  }

  const admin = resolveDemoAdmin(adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  const demoCreds = getCredentialsByRestaurantId(restaurantId);
  return NextResponse.json({
    staff: demoCreds
      .filter((c) => c.role === "restaurant_staff")
      .map((c) => ({
        id: c.adminId,
        email: c.email,
        name: c.label || c.email.split("@")[0],
        role: c.role,
      })),
  });
}

export async function POST(req: NextRequest) {
  const { name, email, password, restaurantId, adminId } = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    restaurantId?: string;
    adminId?: string;
  };

  if (!name || !email || !password || !restaurantId || !adminId) {
    return NextResponse.json(
      { error: "name, email, password, restaurantId, and adminId are required" },
      { status: 400 },
    );
  }

  const admin = resolveDemoAdmin(adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  const newId = crypto.randomUUID();
  addCredential({
    adminId: newId,
    restaurantId,
    email: email.toLowerCase().trim(),
    password,
    role: "restaurant_staff",
    label: name.trim(),
  });

  return NextResponse.json({
    staff: {
      id: newId,
      email: email.toLowerCase().trim(),
      name,
      role: "restaurant_staff",
    },
  });
}
