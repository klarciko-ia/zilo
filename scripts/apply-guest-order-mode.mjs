#!/usr/bin/env node
/**
 * Applies supabase/migrations/0005_guest_order_mode.sql
 *
 *   npm run db:guest-order-mode
 *
 * Needs DATABASE_URL in .env.local (Supabase → Settings → Database → URI).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* no .env.local */
  }
}

loadEnvLocal();

const url =
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!url) {
  console.error(`
Missing DATABASE_URL. Add to .env.local (Supabase → Database → Connection string URI), then:
  npm run db:guest-order-mode
`);
  process.exit(1);
}

const sql = readFileSync(
  join(root, "supabase/migrations/0005_guest_order_mode.sql"),
  "utf8"
);

const client = new pg.Client({
  connectionString: url,
  ssl: url.includes("supabase") ? { rejectUnauthorized: false } : undefined,
});
await client.connect();
try {
  await client.query(sql);
  console.log("OK: restaurants.guest_order_mode (migration 0005).");
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await client.end();
}
