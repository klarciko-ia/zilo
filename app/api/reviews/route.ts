import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getSupabase();

  const { data: reviews } = await db
    .from("reviews")
    .select("*, table_orders(table_id, restaurant_tables(qr_slug))")
    .order("created_at", { ascending: false });

  return NextResponse.json({
    reviews: (reviews ?? []).map((r: Record<string, unknown>) => {
      const tableOrder = r.table_orders as Record<string, unknown> | null;
      const restTable = tableOrder?.restaurant_tables as Record<string, unknown> | null;
      return {
        id: r.id,
        restaurantId: r.restaurant_id,
        orderId: r.order_id,
        tableSlug: restTable?.qr_slug ?? null,
        rating: r.rating,
        feedbackText: r.feedback_text,
        redirectedToGoogle: r.redirected_to_google,
        createdAt: r.created_at,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const db = getSupabase();
  const body = await req.json();
  const { restaurantId, tableSlug, orderId, rating, feedbackText, redirectedToGoogle } =
    body as {
      restaurantId?: string;
      tableSlug?: string;
      orderId?: string;
      rating: number;
      feedbackText?: string;
      redirectedToGoogle: boolean;
    };

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  if (rating <= 3 && !feedbackText?.trim()) {
    return NextResponse.json(
      { error: "Feedback required for low ratings" },
      { status: 400 }
    );
  }

  let resolvedRestaurantId = restaurantId;

  if (!resolvedRestaurantId && tableSlug) {
    const { data: table } = await db
      .from("restaurant_tables")
      .select("restaurant_id")
      .eq("qr_slug", tableSlug)
      .single();
    if (table) resolvedRestaurantId = table.restaurant_id;
  }

  if (!resolvedRestaurantId) {
    return NextResponse.json(
      { error: "Could not resolve restaurant" },
      { status: 400 }
    );
  }

  const { data: review, error } = await db
    .from("reviews")
    .insert({
      restaurant_id: resolvedRestaurantId,
      order_id: orderId ?? null,
      rating,
      feedback_text: feedbackText?.trim() ?? null,
      redirected_to_google: redirectedToGoogle,
    })
    .select()
    .single();

  if (error || !review) {
    return NextResponse.json(
      { error: "Failed to save review" },
      { status: 500 }
    );
  }

  return NextResponse.json({ reviewId: review.id }, { status: 201 });
}
