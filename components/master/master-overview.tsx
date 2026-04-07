"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { MasterKpiCards, type Restaurant } from "./master-kpi-cards";
import { MasterActivityFeed } from "./master-activity-feed";

export function MasterOverview() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(() => {
    const session = getAdminSession();
    if (!session?.id) {
      setSessionOk(false);
      setLoading(false);
      return;
    }
    setSessionOk(true);
    setLoading(true);
    fetch(
      `/api/master/restaurants?adminId=${encodeURIComponent(session.id)}`
    )
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setError(j.error || "Failed to load");
          return;
        }
        setError(null);
        setRestaurants((j.restaurants ?? []) as Restaurant[]);
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Overview</h1>
        <p className="text-sm text-slate-500">
          Bienvenue. Voici votre activité en un coup d&apos;œil.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {sessionOk === false && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <p className="font-medium">Session requise</p>
          <p className="mt-1 text-amber-800/90">
            Connectez-vous pour afficher la console Master.
          </p>
          <button
            type="button"
            onClick={() => router.push("/master/login")}
            className="mt-3 rounded-lg bg-[#062946] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#062946]/90"
          >
            Se connecter
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-[#f0dbc8]/60"
            />
          ))}
        </div>
      ) : sessionOk ? (
        <MasterKpiCards restaurants={restaurants} />
      ) : null}

      {!loading && sessionOk && <MasterActivityFeed restaurants={restaurants} />}
    </div>
  );
}
