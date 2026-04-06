"use client";

import { AdminGuard } from "@/components/admin-guard";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-session";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type GuestOrderMode = "self_service" | "waiter_service";

type RestaurantRow = {
  restaurantId: string;
  name: string;
  guestOrderMode: GuestOrderMode;
};

export function AdminRestaurantsClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = getAdminSession();
    if (!isSuperAdmin(session)) {
      router.replace("/admin/dashboard");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/restaurant-settings?adminId=${encodeURIComponent(session!.id)}`
      );
      const data = (await res.json()) as {
        error?: string;
        restaurants?: RestaurantRow[];
        canEditTier?: boolean;
      };
      if (!res.ok) {
        setError(data.error || "Could not load restaurants.");
        return;
      }
      if (!data.canEditTier) {
        router.replace("/admin/dashboard");
        return;
      }
      setRestaurants(data.restaurants ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTierChange = async (restaurantId: string, mode: GuestOrderMode) => {
    const session = getAdminSession();
    if (!session?.id) return;
    setSavingId(restaurantId);
    setError(null);
    try {
      const res = await fetch("/api/admin/restaurant-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: session.id,
          restaurantId,
          guestOrderMode: mode,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      setRestaurants((prev) =>
        prev.map((r) =>
          r.restaurantId === restaurantId ? { ...r, guestOrderMode: mode } : r
        )
      );
    } catch {
      setError("Network error while saving.");
    } finally {
      setSavingId(null);
    }
  };

  const onLogout = () => {
    logoutAdmin();
    router.push("/admin/login");
  };

  return (
    <AdminGuard>
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Master Admin
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-brand">
              Tier Control Per Restaurant
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/master"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Master home
            </Link>
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Dashboard
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

        <p className="text-sm text-slate-600">
          Set Tier 1 or Tier 2 for each restaurant. This can only be changed by Master Admin.
        </p>

        {error ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : restaurants.length === 0 ? (
          <p className="text-sm text-slate-500">No restaurants found.</p>
        ) : (
          <ul className="space-y-4">
            {restaurants.map((r) => (
              <li
                key={r.restaurantId}
                className="glass-card space-y-3 rounded-2xl p-5"
              >
                <h2 className="text-lg font-semibold tracking-tight text-brand">
                  {r.name}
                </h2>
                <div className="flex flex-col gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name={`tier-${r.restaurantId}`}
                      checked={r.guestOrderMode === "self_service"}
                      disabled={savingId === r.restaurantId}
                      onChange={() =>
                        void onTierChange(r.restaurantId, "self_service")
                      }
                      className="text-brand"
                    />
                    Tier 1 — Self-order (QR)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm">
                    <input
                      type="radio"
                      name={`tier-${r.restaurantId}`}
                      checked={r.guestOrderMode === "waiter_service"}
                      disabled={savingId === r.restaurantId}
                      onChange={() =>
                        void onTierChange(r.restaurantId, "waiter_service")
                      }
                      className="text-brand"
                    />
                    Tier 2 — Waiter orders (browse only)
                  </label>
                </div>
                {savingId === r.restaurantId ? (
                  <p className="text-xs text-slate-500">Saving…</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminGuard>
  );
}
