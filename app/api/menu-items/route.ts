import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";

export async function GET() {
  const db = getSupabase();
  const { data, error } = await db
    .from("menu_items")
    .select("id, name, description, price, image_url, category_id, is_available, created_at")
    .eq("restaurant_id", RESTAURANT_ID)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((i: Record<string, unknown>) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: Number(i.price),
      imageUrl: i.image_url,
      categoryId: i.category_id,
      isAvailable: i.is_available,
    })),
  });
}

export async function POST(req: NextRequest) {
  const db = getSupabase();
  const body = (await req.json()) as {
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    imageUrl?: string;
    isAvailable?: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (body.price == null || body.price < 0) {
    return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
  }

  const { data, error } = await db
    .from("menu_items")
    .insert({
      restaurant_id: RESTAURANT_ID,
      category_id: body.categoryId,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      price: body.price,
      image_url: body.imageUrl ?? null,
      is_available: body.isAvailable ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      imageUrl: data.image_url,
      categoryId: data.category_id,
      isAvailable: data.is_available,
    },
    { status: 201 }
  );
}
