import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const NOTE_MAX = 200;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let db;
  try {
    db = getSupabase();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 503 }
    );
  }

  const slug = params.id;
  const { data: table, error: tableErr } = await db
    .from("restaurant_tables")
    .select("id, restaurant_id")
    .eq("qr_slug", slug)
    .single();

  if (tableErr || !table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  let note: string | null = null;
  try {
    const body = (await req.json()) as { note?: string };
    if (typeof body.note === "string" && body.note.trim()) {
      note = body.note.trim().slice(0, NOTE_MAX);
    }
  } catch {
    /* empty body ok */
  }

  const { data: existingRows, error: existingErr } = await db
    .from("waiter_requests")
    .select("id")
    .eq("table_id", table.id)
    .eq("status", "open")
    .limit(1);

  if (existingErr) {
    return NextResponse.json(
      {
        error: "Waiter requests are not available.",
        details: existingErr.message,
        hint:
          existingErr.message.includes("waiter_requests") ||
          existingErr.code === "42P01" ||
          existingErr.code === "PGRST205"
            ? "Apply supabase/migrations/0002_waiter_requests.sql in the Supabase SQL editor."
            : undefined,
      },
      { status: 503 }
    );
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
    return NextResponse.json(
      {
        error: "Could not create waiter request",
        details: insertErr?.message,
        hint:
          insertErr?.message?.includes("waiter_requests") ||
          insertErr?.code === "42P01"
            ? "Apply supabase/migrations/0002_waiter_requests.sql in the Supabase SQL editor."
            : undefined,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: row.id, deduped: false });
}
