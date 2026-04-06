"use client";

import { AdminGuard } from "@/components/admin-guard";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { playKitchenChime } from "@/lib/kitchen-chime";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type KitchenLine = {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  menuItemId: string | null;
};

type KitchenTicket = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  tableId: string;
  tableNumber: number | null;
  qrSlug: string | null;
  items: KitchenLine[];
};

function statusLabel(s: string): string {
  switch (s) {
    case "new":
      return "New";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "done":
      return "Done";
    default:
      return s;
  }
}

const NEXT_STATUS: Record<string, string | null> = {
  new: "preparing",
  preparing: "ready",
  ready: "done",
};

export function KitchenDisplayClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedVenueId = searchParams.get("restaurantId");
  const [orders, setOrders] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const firstFetch = useRef(true);

  const fetchOrders = useCallback(async (opts?: { silent?: boolean }) => {
    const session = getAdminSession();
    const p = new URLSearchParams();
    if (session?.id) p.set("adminId", session.id);
    if (session?.role === "super_admin" && scopedVenueId) {
      p.set("restaurantId", scopedVenueId);
    }
    const qs = p.toString() ? `?${p}` : "";
    try {
      const res = await fetch(`/api/admin/kitchen-orders${qs}`);
      const data = await res.json();
      if (!res.ok) {
        setFetchError("Could not load kitchen tickets.");
        return;
      }
      if (data.error) {
        setFetchError(
          data.hint ? `${data.error} — ${data.hint}` : String(data.error)
        );
      } else {
        setFetchError(null);
      }
      const list = (data.orders ?? []) as KitchenTicket[];
      const nextIds = new Set(list.map((o) => o.id));
      if (!firstFetch.current && !opts?.silent) {
        for (const o of list) {
          if (!knownIds.current.has(o.id)) playKitchenChime();
        }
      }
      firstFetch.current = false;
      knownIds.current = nextIds;
      setOrders(list);
    } catch {
      setFetchError("Network error loading kitchen.");
    } finally {
      setLoading(false);
    }
  }, [scopedVenueId]);

  useEffect(() => {
    fetchOrders({ silent: true });
  }, [fetchOrders]);

  useEffect(() => {
    const poll = window.setInterval(() => fetchOrders({ silent: true }), 5_000);
    return () => window.clearInterval(poll);
  }, [fetchOrders]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchOrders({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchOrders]);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const channel = sb
      .channel("kitchen_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "kitchen_orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [fetchOrders]);

  const advance = async (id: string, status: string) => {
    const sid = getAdminSession()?.id;
    if (!sid) return;
    setPatching(id);
    try {
      const res = await fetch(`/api/admin/kitchen-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminId: sid }),
      });
      if (res.ok) {
        await fetchOrders({ silent: true });
      }
    } catch {
      /* ignore */
    } finally {
      setPatching(null);
    }
  };

  return (
    <AdminGuard>
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {scopedVenueId ? "Filtered venue" : "All venues"}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-brand">
              Kitchen
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={
                scopedVenueId
                  ? `/admin/dashboard?restaurantId=${encodeURIComponent(scopedVenueId)}`
                  : "/admin/dashboard"
              }
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Tables
            </Link>
            <Link
              href="/admin/master"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Master home
            </Link>
            <button
              type="button"
              onClick={() => fetchOrders({ silent: true })}
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm transition hover:border-slate-300"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                logoutAdmin();
                router.push("/admin/login");
              }}
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm transition hover:border-slate-300"
            >
              Log out
            </button>
          </div>
        </div>

        {fetchError ? (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950 ring-1 ring-amber-200">
            {fetchError}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading tickets…</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">No active tickets.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => {
              const next = NEXT_STATUS[o.status];
              const lines = Array.isArray(o.items) ? o.items : [];
              const lineTotal = lines.reduce(
                (s, it) => s + it.unitPrice * it.quantity,
                0
              );
              return (
                <li
                  key={o.id}
                  className="glass-card space-y-3 rounded-2xl border border-slate-200/80 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-brand">
                        Table {o.tableNumber ?? "?"}
                        {o.qrSlug ? (
                          <span className="font-normal text-slate-500">
                            {" "}
                            · QR {o.qrSlug}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(o.createdAt).toLocaleString()} ·{" "}
                        {statusLabel(o.status)}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                      {lineTotal.toFixed(2)} MAD
                    </span>
                  </div>
                  <ul className="space-y-1 border-t border-slate-100 pt-2 text-sm text-slate-800">
                    {lines.map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span>
                          <span className="font-medium">{it.name}</span>
                          <span className="text-slate-500">
                            {" "}
                            × {it.quantity}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {next ? (
                    <button
                      type="button"
                      disabled={patching === o.id}
                      onClick={() => advance(o.id, next)}
                      className="w-full rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
                    >
                      {patching === o.id
                        ? "…"
                        : next === "done"
                          ? "Mark done"
                          : `Mark ${statusLabel(next)}`}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminGuard>
  );
}
