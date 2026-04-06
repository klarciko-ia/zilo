"use client";

import { AdminGuard } from "@/components/admin-guard";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { playWaiterChime } from "@/lib/waiter-chime";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type WaiterRequestRow = {
  id: string;
  createdAt: string;
  note: string | null;
  tableId: string;
  tableNumber: number | null;
  qrSlug: string | null;
};

type AdminTable = {
  id: string;
  tableNumber: number;
  qrSlug: string;
  restaurant?: { id?: string; name?: string } | null;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    amountCashPending: number;
    remainingAmount: number;
    payments: Array<{
      id: string;
      amount: number;
      paymentMethod: string;
      status: string;
    }>;
  } | null;
};

function formatStatus(status: string): string {
  switch (status) {
    case "unpaid": return "Unpaid";
    case "partially_paid": return "Partial";
    case "pending_cash": return "Pending cash";
    case "paid": return "Paid";
    default: return status;
  }
}

type GuestOrderMode = "self_service" | "waiter_service";

export function AdminDashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scopedVenueId = searchParams.get("restaurantId");
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [guestOrderMode, setGuestOrderMode] =
    useState<GuestOrderMode>("self_service");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [waiterRequests, setWaiterRequests] = useState<WaiterRequestRow[]>([]);
  const [waiterFetchError, setWaiterFetchError] = useState<string | null>(null);
  const [dismissingWaiter, setDismissingWaiter] = useState<string | null>(null);
  const knownOpenWaiterIds = useRef<Set<string>>(new Set());
  const waiterFirstFetch = useRef(true);
  const [canEditTier, setCanEditTier] = useState(false);
  const [multiVenueOwner, setMultiVenueOwner] = useState(false);
  const [venueLabel, setVenueLabel] = useState<string | null>(null);

  useEffect(() => {
    const session = getAdminSession();
    // Prevent company owner from landing on staff dashboard by default.
    if (session?.role === "super_admin" && !scopedVenueId) {
      router.replace("/admin/master");
    }
  }, [router, scopedVenueId]);

  const adminListQuery = useCallback(() => {
    const session = getAdminSession();
    const p = new URLSearchParams();
    if (session?.id) p.set("adminId", session.id);
    if (session?.role === "super_admin" && scopedVenueId) {
      p.set("restaurantId", scopedVenueId);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [scopedVenueId]);

  const fetchTables = useCallback(async () => {
    const qs = adminListQuery();
    try {
      const res = await fetch(`/api/admin/tables${qs}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables ?? []);
      }
    } catch {
      /* offline / no supabase — tables stay empty */
    } finally {
      setLoading(false);
    }
  }, [adminListQuery]);

  const fetchWaiterRequests = useCallback(async (opts?: { silent?: boolean }) => {
    const qs = adminListQuery();
    try {
      const res = await fetch(`/api/admin/waiter-requests${qs}`);
      if (!res.ok) {
        setWaiterFetchError("Could not load waiter requests.");
        return;
      }
      const data = await res.json();
      if (data.error) {
        setWaiterFetchError(
          data.hint ? `${data.error} — ${data.hint}` : String(data.error)
        );
      } else {
        setWaiterFetchError(null);
      }
      const list = (data.requests ?? []) as WaiterRequestRow[];
      const nextIds = new Set(list.map((r) => r.id));
      if (!waiterFirstFetch.current && !opts?.silent) {
        for (const r of list) {
          if (!knownOpenWaiterIds.current.has(r.id)) playWaiterChime();
        }
      }
      waiterFirstFetch.current = false;
      knownOpenWaiterIds.current = nextIds;
      setWaiterRequests(list);
    } catch {
      setWaiterFetchError("Network error loading waiter requests.");
    }
  }, [adminListQuery]);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    const sid = getAdminSession()?.id;
    const qs = sid ? `?adminId=${encodeURIComponent(sid)}` : "";
    try {
      const res = await fetch(`/api/admin/restaurant-settings${qs}`);
      if (res.ok) {
        const data = (await res.json()) as {
          guestOrderMode?: GuestOrderMode;
          restaurantId?: string | null;
          canEditTier?: boolean;
          restaurants?: Array<{
            restaurantId: string;
            name: string;
            guestOrderMode: GuestOrderMode;
          }>;
        };
        setCanEditTier(Boolean(data.canEditTier));
        const restaurants = data.restaurants ?? [];
        const multi =
          Boolean(data.canEditTier) && restaurants.length > 1 && !scopedVenueId;
        setMultiVenueOwner(multi);
        const one = restaurants.length === 1 ? restaurants[0] : null;
        const scoped =
          data.canEditTier && scopedVenueId
            ? restaurants.find((r) => r.restaurantId === scopedVenueId)
            : null;
        if (
          scoped &&
          (scoped.guestOrderMode === "waiter_service" ||
            scoped.guestOrderMode === "self_service")
        ) {
          setGuestOrderMode(scoped.guestOrderMode);
          setRestaurantId(scoped.restaurantId);
          setVenueLabel(scoped.name);
        } else if (
          one &&
          (one.guestOrderMode === "waiter_service" ||
            one.guestOrderMode === "self_service")
        ) {
          setGuestOrderMode(one.guestOrderMode);
          setRestaurantId(one.restaurantId);
          setVenueLabel(one.name);
        } else if (
          (data.guestOrderMode === "waiter_service" ||
            data.guestOrderMode === "self_service") &&
          !data.canEditTier
        ) {
          setGuestOrderMode(data.guestOrderMode);
          setRestaurantId(data.restaurantId ?? null);
          setVenueLabel(one?.name ?? null);
        } else if (data.canEditTier && multi) {
          setVenueLabel(null);
        }
      }
    } catch {
      /* keep defaults */
    } finally {
      setSettingsLoading(false);
    }
  }, [scopedVenueId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (tables.length && scopedVenueId) {
      const t = tables.find(
        (x) =>
          x.restaurant &&
          typeof x.restaurant === "object" &&
          "id" in x.restaurant &&
          x.restaurant.id === scopedVenueId
      );
      if (t?.restaurant?.name) setVenueLabel(t.restaurant.name);
    }
  }, [tables, scopedVenueId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSaveGuestMode = async (mode: GuestOrderMode) => {
    const sid = getAdminSession()?.id;
    if (!sid) return;
    setSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/restaurant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestOrderMode: mode,
          restaurantId: restaurantId ?? undefined,
          adminId: sid,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { guestOrderMode?: GuestOrderMode };
        if (
          data.guestOrderMode === "waiter_service" ||
          data.guestOrderMode === "self_service"
        ) {
          setGuestOrderMode(data.guestOrderMode);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => {
    fetchWaiterRequests({ silent: true });
  }, [fetchWaiterRequests]);

  useEffect(() => {
    const poll = window.setInterval(() => fetchWaiterRequests({ silent: true }), 5_000);
    return () => window.clearInterval(poll);
  }, [fetchWaiterRequests]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        fetchWaiterRequests({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchWaiterRequests]);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const channel = sb
      .channel("waiter_requests_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "waiter_requests" },
        () => {
          fetchWaiterRequests();
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [fetchWaiterRequests]);

  const onLogout = () => {
    logoutAdmin();
    router.push("/admin/login");
  };

  const onDismissWaiter = async (id: string) => {
    const sid = getAdminSession()?.id;
    if (!sid) return;
    setDismissingWaiter(id);
    try {
      const res = await fetch(`/api/admin/waiter-requests/${id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: sid }),
      });
      if (res.ok) {
        knownOpenWaiterIds.current.delete(id);
        await fetchWaiterRequests({ silent: true });
      }
    } catch {
      /* ignore */
    } finally {
      setDismissingWaiter(null);
    }
  };

  const onConfirmCash = async (paymentId: string) => {
    setConfirming(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
      });
      if (res.ok) await fetchTables();
    } catch {
      /* ignore */
    } finally {
      setConfirming(null);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {venueLabel
                ? venueLabel
                : canEditTier && multiVenueOwner
                  ? "All venues"
                  : "Operations"}
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-brand">Tables</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEditTier ? (
              <Link
                href="/admin/master"
                className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
              >
                Master home
              </Link>
            ) : null}
            {canEditTier ? (
              <Link
                href="/admin/restaurants"
                className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
              >
                Tiers
              </Link>
            ) : null}
            <Link
              href={
                scopedVenueId
                  ? `/admin/kitchen?restaurantId=${encodeURIComponent(scopedVenueId)}`
                  : "/admin/kitchen"
              }
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Kitchen
            </Link>
            <Link
              href="/admin/menu"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Menu
            </Link>
            <Link
              href="/admin/feedback"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Feedback
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm text-slate-700 backdrop-blur-sm transition hover:border-slate-300"
            >
              Log out
            </button>
          </div>
        </div>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <h2 className="text-sm font-semibold tracking-tight text-brand">
            Guest ordering mode
          </h2>
          <p className="text-xs text-slate-600">
            Tier 1: guests order from the QR. Tier 2: browse-only menu; staff
            takes the order (POS / pad). Hub stays for pay, split &amp; review.
          </p>
          {settingsLoading ? (
            <p className="text-xs text-slate-500">Loading…</p>
          ) : multiVenueOwner ? (
            <p className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-700">
              Ordering tier is set{" "}
              <span className="font-medium text-brand">per restaurant</span>.
              Open{" "}
              <Link
                href="/admin/master"
                className="font-medium underline-offset-2 hover:underline"
              >
                Master home
              </Link>{" "}
              or{" "}
              <Link
                href="/admin/restaurants"
                className="font-medium underline-offset-2 hover:underline"
              >
                Tiers
              </Link>{" "}
              to choose Tier 1 or Tier 2 for each venue.
            </p>
          ) : canEditTier ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="guestOrderMode"
                  checked={guestOrderMode === "self_service"}
                  disabled={settingsSaving}
                  onChange={() => void onSaveGuestMode("self_service")}
                  className="text-brand"
                />
                Tier 1 — Self-order (QR)
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="guestOrderMode"
                  checked={guestOrderMode === "waiter_service"}
                  disabled={settingsSaving}
                  onChange={() => void onSaveGuestMode("waiter_service")}
                  className="text-brand"
                />
                Tier 2 — Waiter orders (menu browse only)
              </label>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm text-slate-700">
              Current tier:{" "}
              <span className="font-medium text-brand">
                {guestOrderMode === "waiter_service"
                  ? "Tier 2 — Waiter orders (browse only)"
                  : "Tier 1 — Self-order (QR)"}
              </span>
              . Only the company owner can change this.
            </p>
          )}
          {settingsSaving ? (
            <p className="text-xs text-slate-500">Saving…</p>
          ) : null}
        </section>

        <section className="glass-card space-y-3 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-brand">Waiter calls</h2>
            <button
              type="button"
              onClick={() => fetchWaiterRequests({ silent: true })}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-brand hover:underline"
            >
              Refresh
            </button>
          </div>
          {waiterFetchError ? (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-950 ring-1 ring-amber-200">
              {waiterFetchError}
            </p>
          ) : null}
          {!waiterFetchError && waiterRequests.length === 0 ? (
            <p className="text-sm text-slate-500">No open waiter requests.</p>
          ) : null}
          {!waiterFetchError && waiterRequests.length > 0 ? (
            <ul className="space-y-2">
              {waiterRequests.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-col gap-2 rounded-xl border border-coral-mid/40 bg-coral-light/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-brand">
                      Table {w.tableNumber ?? "?"}
                      {w.qrSlug ? (
                        <span className="font-normal text-slate-500"> · QR {w.qrSlug}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(w.createdAt).toLocaleString()}
                    </p>
                    {w.note ? (
                      <p className="mt-1 text-xs text-slate-700">{w.note}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={dismissingWaiter === w.id}
                    onClick={() => onDismissWaiter(w.id)}
                    className="shrink-0 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                  >
                    {dismissingWaiter === w.id ? "…" : "Dismiss"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {loading ? (
          <p className="text-sm text-slate-500">Loading tables…</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tables found. Make sure Supabase is configured and seeded.
          </p>
        ) : (
          tables.map((t) => {
            const order = t.order;
            const paid =
              order?.payments
                .filter((p) => p.status === "completed")
                .reduce((s, p) => s + p.amount, 0) ?? 0;
            const pendingCash = order?.amountCashPending ?? 0;
            const remaining = order?.remainingAmount ?? null;
            const total = order?.totalAmount ?? null;
            const statusLabel = order ? formatStatus(order.status) : "No bill";

            const pendingCashPayments =
              order?.payments.filter(
                (p) =>
                  p.paymentMethod === "cash" &&
                  p.status === "pending_cash_confirm"
              ) ?? [];

            return (
              <section
                key={t.id}
                className="glass-card space-y-3 rounded-2xl p-5"
              >
                <h2 className="text-lg font-semibold tracking-tight text-brand">Table {t.tableNumber}</h2>
                {t.restaurant?.name ? (
                  <p className="text-xs font-medium text-slate-600">{t.restaurant.name}</p>
                ) : null}
                <p className="text-xs text-slate-500">QR id: {t.qrSlug}</p>

                {!order ? (
                  <p className="text-sm text-slate-600">
                    No active order for this table yet.
                  </p>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <dt className="text-slate-600">Total</dt>
                      <dd className="text-right font-medium">
                        {total!.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Paid (confirmed)</dt>
                      <dd className="text-right font-medium">
                        {paid.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Cash pending</dt>
                      <dd className="text-right font-medium">
                        {pendingCash.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Remaining</dt>
                      <dd className="text-right font-medium">
                        {remaining!.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Status</dt>
                      <dd className="text-right font-medium">{statusLabel}</dd>
                    </dl>

                    {pendingCashPayments.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-sm font-medium text-slate-800">
                          Confirm cash received
                        </p>
                        {pendingCashPayments.map((payment) => (
                          <button
                            key={payment.id}
                            type="button"
                            disabled={confirming === payment.id}
                            onClick={() => onConfirmCash(payment.id)}
                            className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {confirming === payment.id
                              ? "Confirming…"
                              : `Confirm ${payment.amount.toFixed(2)} MAD (cash)`}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>
    </AdminGuard>
  );
}
