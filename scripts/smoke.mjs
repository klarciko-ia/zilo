#!/usr/bin/env node
/**
 * HTTP smoke checks against a running Next dev or start server.
 * Usage: npm run test:smoke
 * Env:   BASE_URL (default http://127.0.0.1:3000), SMOKE_STRICT=1 to fail on warnings
 */

const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const STRICT = process.env.SMOKE_STRICT === "1";

let failed = false;
let warned = false;

function fail(msg) {
  console.error("FAIL", msg);
  failed = true;
}
function warn(msg) {
  console.warn("WARN", msg);
  warned = true;
}
function ok(msg) {
  console.log("OK  ", msg);
}

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  console.log(`Zilo smoke test → ${BASE}\n`);

  let r = await req("/table/1");
  if (!r.ok) fail(`GET /table/1 → ${r.status}`);
  else ok("GET /table/1 (landing)");

  r = await req("/table/1/menu");
  if (!r.ok) fail(`GET /table/1/menu → ${r.status}`);
  else ok("GET /table/1/menu");

  r = await req("/table/1/hub");
  if (!r.ok) fail(`GET /table/1/hub → ${r.status}`);
  else ok("GET /table/1/hub");

  r = await req("/table/1/order-review");
  if (!r.ok) fail(`GET /table/1/order-review → ${r.status}`);
  else ok("GET /table/1/order-review");

  r = await req("/table/1/checkout");
  if (!r.ok) fail(`GET /table/1/checkout → ${r.status}`);
  else ok("GET /table/1/checkout (shell)");

  r = await req("/api/admin/kitchen-orders");
  if (!r.ok) fail(`GET /api/admin/kitchen-orders → ${r.status}`);
  else {
    const j = await r.json().catch(() => null);
    if (!j || !Array.isArray(j.orders)) {
      fail("GET /api/admin/kitchen-orders: expected JSON with orders[]");
    } else {
      ok("GET /api/admin/kitchen-orders");
      if (j.error) warn(`kitchen-orders body error: ${j.error}`);
    }
  }

  r = await req("/api/tables/1/order");
  if (r.ok) {
    const j = await r.json().catch(() => null);
    if (!j || !("order" in j)) fail("GET /api/tables/1/order: expected { order }");
    else ok("GET /api/tables/1/order");
  } else if (r.status === 404) {
    warn(
      "GET /api/tables/1/order → 404 (no table with qr_slug=1 in DB — OK for empty project)"
    );
  } else {
    warn(
      `GET /api/tables/1/order → ${r.status} (often missing NEXT_PUBLIC_SUPABASE_* on server)`
    );
  }

  r = await req("/api/tables/1/kitchen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [] }),
  });
  if (r.status === 400) {
    ok("POST /api/tables/1/kitchen rejects empty items");
  } else if (r.status === 503) {
    warn("POST /api/tables/1/kitchen → 503 (Supabase not configured)");
  } else {
    const txt = await r.text();
    fail(
      `POST /api/tables/1/kitchen with items:[] → expected 400, got ${r.status} ${txt.slice(0, 120)}`
    );
  }

  console.log("");
  if (failed) {
    console.error("Smoke test FAILED.\n");
    process.exit(1);
  }
  if (warned && STRICT) {
    console.error("Smoke test FAILED (SMOKE_STRICT=1: warnings treated as errors).\n");
    process.exit(1);
  }
  if (warned) {
    console.log(
      "Passed with warnings — fix Supabase/table seed before relying on order APIs.\n"
    );
  } else {
    console.log("All automated checks passed.\n");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  if (e instanceof Error && e.name === "AbortError") {
    console.error("(timeout — is the dev server running?)");
  }
  process.exit(1);
});
