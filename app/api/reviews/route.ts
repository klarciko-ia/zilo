import { NextRequest, NextResponse } from "next/server";
import { getTableBySlug } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

const demoReviews: Array<Record<string, unknown>> = [];

export async function GET() {
  return NextResponse.json({ reviews: demoReviews });
}

export async function POST(req: NextRequest) {
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

  let resolvedRestaurantId = restaurantId;
  if (!resolvedRestaurantId && tableSlug) {
    const hit = getTableBySlug(tableSlug);
    if (hit) resolvedRestaurantId = hit.restaurantId;
  }

  if (!resolvedRestaurantId) {
    resolvedRestaurantId = "unknown";
  }

  const reviewId = `demo-review-${Date.now()}`;
  demoReviews.unshift({
    id: reviewId,
    restaurantId: resolvedRestaurantId,
    orderId: orderId ?? null,
    tableSlug: tableSlug ?? null,
    rating,
    feedbackText: feedbackText?.trim() ?? null,
    redirectedToGoogle,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ reviewId }, { status: 201 });
}
