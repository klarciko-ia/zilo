import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const body = (await req.json()) as {
    name?: string;
    description?: string;
    price?: number;
    categoryId?: string;
    imageUrl?: string | null;
    isAvailable?: boolean;
  };

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.price !== undefined) updates.price = body.price;
  if (body.categoryId !== undefined) updates.category_id = body.categoryId;
  if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
  if (body.isAvailable !== undefined) updates.is_available = body.isAvailable;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("menu_items")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    id: data.id,
    name: data.name,
    description: data.description,
    price: Number(data.price),
    imageUrl: data.image_url,
    categoryId: data.category_id,
    isAvailable: data.is_available,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = getSupabase();
  const { error } = await db.from("menu_items").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
