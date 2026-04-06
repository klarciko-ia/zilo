import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

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

  try {
    const db = getSupabase();
    const { data: admin, error: selErr } = await db
      .from("admin_users")
      .select("id, email, restaurant_id, password_hash, role")
      .eq("email", normalized)
      .single();

    if (!selErr && admin && admin.password_hash === password) {
      const role =
        admin.role === "super_admin"
          ? "super_admin"
          : admin.role === "restaurant_owner"
            ? "restaurant_owner"
            : "restaurant_admin";

      return NextResponse.json({
        admin: {
          id: admin.id,
          email: admin.email,
          restaurantId: admin.restaurant_id,
          role,
        },
      });
    }
  } catch {
    /* Supabase unreachable – fall through to demo check */
  }

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

  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
