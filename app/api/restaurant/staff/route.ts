import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");
  const adminId = req.nextUrl.searchParams.get("adminId");

  if (!restaurantId || !adminId) {
    return NextResponse.json(
      { error: "restaurantId and adminId are required" },
      { status: 400 },
    );
  }

  let admin;
  let db;
  try {
    db = getSupabase();
    admin = await getAdminById(db, adminId);
  } catch {
    admin = null;
    db = null;
  }

  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  if (admin.role !== "restaurant_owner" || admin.restaurantId !== restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (db) {
    try {
      const { data: staff, error } = await db
        .from("admin_users")
        .select("id, email, name, role, created_at")
        .eq("restaurant_id", restaurantId)
        .eq("role", "restaurant_staff")
        .order("created_at", { ascending: false });

      if (!error && staff) {
        return NextResponse.json({
          staff: staff.map((s) => ({
            id: s.id as string,
            email: s.email as string,
            name: (s.name as string) ?? "",
            role: s.role as string,
            createdAt: s.created_at as string,
          })),
        });
      }
    } catch {
      /* fall through to demo */
    }
  }

  return NextResponse.json({ staff: [] });
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

  let admin;
  let db;
  try {
    db = getSupabase();
    admin = await getAdminById(db, adminId);
  } catch {
    admin = null;
    db = null;
  }

  if (!admin) {
    return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
  }

  if (admin.role !== "restaurant_owner" || admin.restaurantId !== restaurantId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (db) {
    try {
      const { data: created, error } = await db
        .from("admin_users")
        .insert({
          name,
          email: email.toLowerCase().trim(),
          password_hash: password,
          restaurant_id: restaurantId,
          role: "restaurant_staff",
        })
        .select("id, email, name, role")
        .single();

      if (!error && created) {
        return NextResponse.json({
          staff: {
            id: created.id as string,
            email: created.email as string,
            name: (created.name as string) ?? "",
            role: created.role as string,
          },
        });
      }

      if (error) {
        return NextResponse.json(
          { error: error.message ?? "Failed to create staff" },
          { status: 500 },
        );
      }
    } catch {
      /* fall through to demo */
    }
  }

  return NextResponse.json({
    staff: {
      id: crypto.randomUUID(),
      email: email.toLowerCase().trim(),
      name,
      role: "restaurant_staff",
    },
  });
}
