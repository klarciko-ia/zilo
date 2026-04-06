import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getAdminById } from "@/lib/admin-server";
import { restaurantFilterForAdmin } from "@/lib/admin-api-scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json({ requests: [] });
  }

  const adminId = req.nextUrl.searchParams.get("adminId");
  const restaurantIdParam = req.nextUrl.searchParams.get("restaurantId");
  let restaurantFilter: string | null = null;
  if (adminId) {
    const admin = await getAdminById(db, adminId);
    if (!admin) {
      return NextResponse.json({ error: "Invalid admin" }, { status: 401 });
    }
    restaurantFilter = restaurantFilterForAdmin(admin, restaurantIdParam);
  }

  let q = db
    .from("waiter_requests")
    .select("id, created_at, note, table_id, restaurant_id")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (restaurantFilter) {
    q = q.eq("restaurant_id", restaurantFilter);
  }

  const { data: rows, error } = await q;

  if (error) {
    return NextResponse.json({
      requests: [],
      error: error.message,
      hint:
        error.message.includes("waiter_requests") ||
        error.code === "42P01" ||
        error.code === "PGRST205"
          ? "Run the SQL migration that creates waiter_requests (see supabase/migrations/0002_waiter_requests.sql)."
          : undefined,
    });
  }

  const list = rows ?? [];
  const tableIds = [...new Set(list.map((r) => r.table_id as string))];

  let tableMap = new Map<
    string,
    { table_number: number; qr_slug: string }
  >();
  if (tableIds.length > 0) {
    const { data: tables, error: tablesErr } = await db
      .from("restaurant_tables")
      .select("id, table_number, qr_slug")
      .in("id", tableIds);
    if (!tablesErr && tables) {
      tableMap = new Map(
        tables.map((t) => [
          t.id as string,
          {
            table_number: Number(t.table_number),
            qr_slug: t.qr_slug as string,
          },
        ])
      );
    }
  }

  const requests = list.map((r) => {
    const t = tableMap.get(r.table_id as string);
    return {
      id: r.id as string,
      createdAt: r.created_at as string,
      note: (r.note as string | null) ?? null,
      tableId: r.table_id as string,
      tableNumber: t?.table_number ?? null,
      qrSlug: t?.qr_slug ?? null,
    };
  });

  return NextResponse.json({ requests });
}
