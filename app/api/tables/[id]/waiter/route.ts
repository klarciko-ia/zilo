import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const NOTE_MAX = 200;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let note: string | null = null;
  try {
    const body = (await req.json()) as { note?: string };
    if (typeof body.note === "string" && body.note.trim()) {
      note = body.note.trim().slice(0, NOTE_MAX);
    }
  } catch {
    /* empty body ok */
  }

  let db;
  try {
    db = getSupabase();
  } catch {
    return demoSuccess(params.id, note);
  }

  const slug = params.id;

  try {
    const { data: table, error: tableErr } = await db
      .from("restaurant_tables")
      .select("id, restaurant_id")
      .eq("qr_slug", slug)
      .single();

    if (tableErr || !table) {
      return demoSuccess(slug, note);
    }

    const { data: existingRows, error: existingErr } = await db
      .from("waiter_requests")
      .select("id")
      .eq("table_id", table.id)
      .eq("status", "open")
      .limit(1);

    if (existingErr) {
      return demoSuccess(slug, note);
    }

    const existing = existingRows?.[0];
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        deduped: true,
        message: "Waiter already notified for this table.",
      });
    }

    const { data: row, error: insertErr } = await db
      .from("waiter_requests")
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        status: "open",
        note,
      })
      .select("id")
      .single();

    if (insertErr || !row) {
      return demoSuccess(slug, note);
    }

    return NextResponse.json({ id: row.id, deduped: false });
  } catch {
    return demoSuccess(slug, note);
  }
}

function demoSuccess(tableSlug: string, note: string | null) {
  return NextResponse.json({
    id: `demo-waiter-${tableSlug}-${Date.now()}`,
    deduped: false,
    note,
  });
}
