#!/usr/bin/env node
/**
 * Runs `npm run dev` and prints URLs when Next is ready.
 * Section 1 = same short list as before (easy to spot). Section 2 = full list.
 * Optional: ZILO_OPEN=1 opens the quick-link set in your browser.
 *
 *   npm run dev:all
 *   ZILO_OPEN=1 npm run dev:all
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

let printed = false;

function extractBase(output) {
  if (!output.includes("Ready")) return null;
  const matches = [...output.matchAll(/Local:\s+(https?:\/\/[^\s]+)/g)];
  if (!matches.length) return null;
  return matches[matches.length - 1][1].replace(/\/$/, "");
}

/** @param {string} label @param {string} url @param {string} [note] */
function row(label, url, note = "") {
  const pad = 22;
  const n = note ? `  ${note}` : "";
  console.log(`   ${label.padEnd(pad)} ${url}${n}`);
}

function printUrls(base) {
  const t = `${base}/table/1`;

  console.log("\n\x1b[1m════════════════════════════════════════════════════════\x1b[0m");
  console.log("\x1b[1m  LOGINS (separate portals)\x1b[0m");
  console.log("\x1b[1m════════════════════════════════════════════════════════\x1b[0m");
  row("Master Login", `${base}/master/login`, "owner@zilo.ma / owner123");
  row("Restaurant Login", `${base}/restaurant/login`, "admin@zilo.ma / admin123");

  console.log("\n\x1b[1m  MASTER CONSOLE\x1b[0m");
  row("Overview", `${base}/admin/master`);
  row("Customers", `${base}/admin/master/restaurants`);

  console.log("\n\x1b[1m  RESTAURANT ADMIN\x1b[0m");
  row("Dashboard", `${base}/admin/dashboard`);
  row("Kitchen", `${base}/admin/kitchen`);

  console.log("\n\x1b[1m  GUEST (table 1)\x1b[0m");
  row("Landing", `${t}`);
  row("Menu", `${t}/menu`);
  row("Hub", `${t}/hub`);
  row("7AM menu", `${base}/table/7am-1/menu`, "Tier 1 seed");
  row("Open House menu", `${base}/table/openhouse-1/menu`, "Tier 2 seed");

  console.log(`\n   \x1b[2mHome: ${base}/\x1b[0m`);
  console.log("\n\x1b[1m════════════════════════════════════════════════════════\x1b[0m\n");
}

function openBrowser(base) {
  const t = `${base}/table/1`;
  const urls = [
    `${base}/admin/login`,
    `${base}/admin/master`,
    `${base}/admin/kitchen`,
    `${t}`,
    `${t}/menu`,
    `${t}/hub`,
    `${t}/order-review`,
  ];
  const { platform } = process;
  for (const url of urls) {
    if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    } else if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], {
        detached: true,
        stdio: "ignore",
        shell: true,
      }).unref();
    } else {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    }
  }
}

let buf = "";
const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  shell: true,
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

child.stdout.on("data", (chunk) => {
  const s = chunk.toString();
  process.stdout.write(chunk);
  buf += s;
  if (printed) return;
  const base = extractBase(buf);
  if (base) {
    printed = true;
    printUrls(base);
    if (process.env.ZILO_OPEN === "1") openBrowser(base);
  }
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  buf += chunk.toString();
  if (printed) return;
  const base = extractBase(buf);
  if (base) {
    printed = true;
    printUrls(base);
    if (process.env.ZILO_OPEN === "1") openBrowser(base);
  }
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
