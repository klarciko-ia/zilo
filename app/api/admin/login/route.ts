import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const db = getSupabase();
  const { email, password } = (await req.json()) as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const { data: admin } = await db
    .from("admin_users")
    .select("id, email, restaurant_id, password_hash")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (!admin) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // MVP: plain text comparison. In production, use bcrypt.
  if (admin.password_hash !== password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  return NextResponse.json({
    admin: {
      id: admin.id,
      email: admin.email,
      restaurantId: admin.restaurant_id,
    },
  });
}
