import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const body = (await req.json()) as { name?: string; sortOrder?: number };
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.sortOrder !== undefined) updates.sort_order = body.sortOrder;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("menu_categories")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    sortOrder: data.sort_order,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();

  const { count } = await db
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("category_id", params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: "Delete or move all items in this category first" },
      { status: 400 }
    );
  }

  const { error } = await db
    .from("menu_categories")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
