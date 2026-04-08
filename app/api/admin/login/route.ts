import { NextRequest, NextResponse } from "next/server";
import { getCredentialByEmail } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const DEMO_LOGINS: Record<string, { password: string; id: string; restaurantId: string | null; role: string }> = {
  "owner@zilo.ma": {
    password: "owner123",
    id: "55555555-5555-5555-5555-555555555550",
    restaurantId: null,
    role: "super_admin",
  },
  "admin@zilo.ma": {
    password: "admin123",
    id: "55555555-5555-5555-5555-555555555551",
    restaurantId: "11111111-1111-1111-1111-111111111111",
    role: "restaurant_admin",
  },
};

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  const demo = DEMO_LOGINS[normalized];
  if (demo && demo.password === password) {
    return NextResponse.json({
      admin: {
        id: demo.id,
        email: normalized,
        restaurantId: demo.restaurantId,
        role: demo.role,
      },
    });
  }

  const dynamicCred = getCredentialByEmail(normalized);
  if (dynamicCred && dynamicCred.password === password) {
    return NextResponse.json({
      admin: {
        id: dynamicCred.adminId,
        email: dynamicCred.email,
        restaurantId: dynamicCred.restaurantId,
        role: dynamicCred.role,
      },
    });
  }

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
