"use client";

import { AdminGuard } from "@/components/admin-guard";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-session";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type GuestOrderMode = "self_service" | "waiter_service";

type RestaurantRow = {
  restaurantId: string;
  name: string;
  guestOrderMode: GuestOrderMode;
};

/** Primary guest QR slug per seeded restaurant (see supabase/seed.sql). */
const PRIMARY_SLUG: Record<string, string> = {
  "11111111-1111-1111-1111-111111111111": "1",
  "11111111-1111-1111-1111-111111111112": "7am-1",
  "11111111-1111-1111-1111-111111111113": "openhouse-1",
};

const PRIORITY_VENUES = ["7AM", "Open House"] as const;

function tierLabel(mode: GuestOrderMode): string {
  return mode === "waiter_service"
    ? "Tier 2 — Waiter (browse only)"
    : "Tier 1 — Self-order (QR)";
}

export function AdminCompanyClient() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        setError(data.error || "Could not load venues.");
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

  const onLogout = () => {
    logoutAdmin();
    router.push("/admin/login");
  };

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
        setError(data.error || "Could not save tier.");
        return;
      }
      setRestaurants((prev) =>
        prev.map((r) =>
          r.restaurantId === restaurantId ? { ...r, guestOrderMode: mode } : r
        )
      );
    } catch {
      setError("Network error while saving tier.");
    } finally {
      setSavingId(null);
    }
  };

  const renderCard = (r: RestaurantRow, emphasized?: boolean) => {
    const slug = PRIMARY_SLUG[r.restaurantId] ?? "1";
    const q = `restaurantId=${encodeURIComponent(r.restaurantId)}`;
    return (
      <li
        key={r.restaurantId}
        className={
          emphasized
            ? "glass-card space-y-3 rounded-2xl p-5 ring-1 ring-coral-mid/25"
            : "glass-card space-y-3 rounded-2xl p-5"
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-brand">{r.name}</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {tierLabel(r.guestOrderMode)}
          </span>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Tier for this restaurant
          </label>
          <select
            value={r.guestOrderMode}
            onChange={(e) =>
              void onTierChange(r.restaurantId, e.target.value as GuestOrderMode)
            }
            disabled={savingId === r.restaurantId}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-coral-mid/50"
          >
            <option value="self_service">Tier 1 — Self-order (QR)</option>
            <option value="waiter_service">Tier 2 — Waiter (browse only)</option>
          </select>
          {savingId === r.restaurantId ? (
            <p className="text-xs text-slate-500">Saving tier…</p>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <Link
            href={`/admin/dashboard?${q}`}
            className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 font-medium text-brand transition hover:border-coral-mid/50"
          >
            Open {r.name} dashboard
          </Link>
          <Link
            href={`/admin/kitchen?${q}`}
            className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 font-medium text-brand transition hover:border-coral-mid/50"
          >
            Open {r.name} kitchen
          </Link>
          <Link
            href={`/table/${slug}/menu`}
            className="rounded-lg border border-coral-mid/30 bg-coral-light/20 px-3 py-2 font-medium text-brand transition hover:border-coral-mid/50"
          >
            Open {r.name} guest menu ({slug})
          </Link>
          <Link
            href={`/table/${slug}/hub`}
            className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-slate-800 transition hover:border-coral-mid/50"
          >
            Open {r.name} guest hub ({slug})
          </Link>
        </div>
      </li>
    );
  };

  return (
    <AdminGuard>
      <div className="mx-auto max-w-lg space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Master Admin
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-brand">
              Company Control Center
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Choose one restaurant first, then test its exact guest path. You are the only
              one allowed to change Tier 1 / Tier 2 under{" "}
              <Link href="/admin/restaurants" className="font-medium text-brand underline-offset-2 hover:underline">
                Master tiers
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/restaurants"
              className="rounded-lg border border-slate-200/90 bg-white/80 px-3 py-2 text-sm font-medium text-brand backdrop-blur-sm transition hover:border-coral-mid/50"
            >
              Master tiers
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

        {error ? (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : restaurants.length === 0 ? (
          <p className="text-sm text-slate-500">No restaurants in the database.</p>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Quick selection (recommended)
              </h2>
              <ul className="space-y-4">
                {restaurants
                  .filter((r) =>
                    PRIORITY_VENUES.some((name) => name.toLowerCase() === r.name.toLowerCase())
                  )
                  .map((r) => renderCard(r, true))}
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                All restaurants
              </h2>
              <ul className="space-y-4">
                {restaurants.map((r) => renderCard(r))}
              </ul>
            </section>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
