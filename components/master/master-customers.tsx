"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { getMasterSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import type { Restaurant } from "./master-kpi-cards";
import { MasterAddCustomer } from "./master-add-customer";

type StatusFilter = "all" | "active" | "inactive" | "new" | "overdue";

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "Tous", value: "all" },
  { label: "Actifs", value: "active" },
  { label: "Inactifs", value: "inactive" },
  { label: "Impayés", value: "overdue" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
      Inactif
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "self_service") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        Self-service
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      Waiter
    </span>
  );
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  if (paymentStatus === "overdue") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        Impayé
      </span>
    );
  }
  return null;
}

function formatLastActivity(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `Il y a ${months} mois`;
}

export function MasterCustomers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  const initialFilter: StatusFilter =
    filterParam === "active" || filterParam === "inactive" || filterParam === "new" || filterParam === "overdue"
      ? filterParam
      : "all";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialFilter);

  const fetchRestaurants = useCallback(() => {
    const session = getMasterSession();
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

  const filtered = useMemo(() => {
    let list = restaurants;
    if (statusFilter === "active") {
      list = list.filter((r) => r.status === "active");
    } else if (statusFilter === "inactive") {
      list = list.filter((r) => r.status === "inactive");
    } else if (statusFilter === "overdue") {
      list = list.filter((r) => r.paymentStatus === "overdue");
    } else if (statusFilter === "new") {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      list = list.filter((r) => new Date(r.createdAt).getTime() > thirtyDaysAgo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [restaurants, statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Customers</h1>
          <p className="text-sm text-slate-500">
            {restaurants.length} restaurant{restaurants.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-[#062946] px-4 text-sm font-medium text-white transition hover:bg-[#062946]/90"
        >
          <Plus size={18} />
          <span>Add Customer</span>
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-[#e3c8af]/30">
        <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#062946] focus:ring-1 focus:ring-[#062946]/20 md:w-56"
            />
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4 md:px-5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-2 text-sm font-medium transition ${
                statusFilter === tab.value
                  ? "border-b-2 border-[#062946] text-[#062946]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          </div>
        ) : sessionOk === false ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Connectez-vous pour voir vos clients.
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            Aucun restaurant trouvé
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Nom</th>
                    <th className="px-5 py-3">Tier</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">MRR</th>
                    <th className="px-5 py-3">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() =>
                        router.push(`/admin/master/restaurants/${r.id}`)
                      }
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-[#faf4ed]/60"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">
                            {r.name}
                          </span>
                          <PaymentBadge paymentStatus={r.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <TierBadge tier={r.tier} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatCurrency(r.planPrice, "USD")}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatLastActivity(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 p-3 md:hidden">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() =>
                    router.push(`/admin/master/restaurants/${r.id}`)
                  }
                  className="w-full rounded-lg border border-slate-100 p-3 text-left transition hover:bg-[#faf4ed]/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">
                      {r.name}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <TierBadge tier={r.tier} />
                    <span>{formatCurrency(r.planPrice, "USD")}/mo</span>
                    <PaymentBadge paymentStatus={r.paymentStatus} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatLastActivity(r.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <MasterAddCustomer
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onCreated={fetchRestaurants}
      />
    </div>
  );
}
