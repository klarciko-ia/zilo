import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";

export async function GET() {
  const db = getSupabase();
  const { data, error } = await db
    .from("menu_categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    categories: (data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id,
      name: c.name,
      sortOrder: c.sort_order,
    })),
  });
}

export async function POST(req: NextRequest) {
  const db = getSupabase();
  const { name, sortOrder } = (await req.json()) as {
    name: string;
    sortOrder?: number;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: maxRow } = await db
    .from("menu_categories")
    .select("sort_order")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = sortOrder ?? ((maxRow?.sort_order as number) ?? 0) + 1;

  const { data, error } = await db
    .from("menu_categories")
    .insert({
      restaurant_id: RESTAURANT_ID,
      name: name.trim(),
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { id: data.id, name: data.name, sortOrder: data.sort_order },
    { status: 201 }
  );
}
