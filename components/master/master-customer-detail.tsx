"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Mail,
  CreditCard,
  Calendar,
  LayoutGrid,
  ShoppingCart,
  DollarSign,
  Clock,
  ChevronDown,
} from "lucide-react";
import { getAdminSession } from "@/lib/admin-session";
import { formatCurrency } from "@/lib/format-currency";
import type { Currency } from "@/lib/types";

type TableInfo = { slug: string; tableNumber: number };

type RestaurantInfo = {
  id: string;
  name: string;
  tier: "self_service" | "waiter_service";
  googleReviewUrl: string | null;
  currency: string;
  status: string;
  plan: string;
  planPrice: number;
  createdAt: string;
  ownerEmail: string | null;
};

type Payload = {
  restaurant: RestaurantInfo;
  overview: {
    revenue: number;
    totalOrders: number;
    openOrders: number;
    avgOrderValue: number;
  };
  billing: { cashPending: number; paymentStatus: string };
  operations: { openWaiterCalls: number; kitchenTicketsOpen: number };
  tables: TableInfo[];
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter — $49/mo",
  growth: "Growth — $99/mo",
  pro: "Pro — $199/mo",
};

function TierBadge({ tier }: { tier: string }) {
  if (tier === "self_service") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
        Tier 1
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
      Tier 2
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      Inactive
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MasterCustomerDetail({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState("");
  const [tierChanging, setTierChanging] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const adminId = typeof window !== "undefined" ? getAdminSession()?.id : null;

  useEffect(() => {
    if (!adminId) return;
    fetch(
      `/api/master/restaurants/${id}/dashboard?adminId=${encodeURIComponent(adminId)}`
    )
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (!ok) {
          setError(j.error || "Failed to load");
          return;
        }
        const payload = j as Payload;
        setData(payload);
        if (payload.tables?.length > 0) {
          setSelectedTable(payload.tables[0].slug);
        }
      })
      .catch(() => setError("Network error"));
  }, [id, adminId]);

  async function handleTierChange(newTier: "self_service" | "waiter_service") {
    if (!adminId || !data || newTier === data.restaurant.tier) return;
    setTierChanging(true);
    try {
      await fetch(
        `/api/master/restaurants/${id}?adminId=${encodeURIComponent(adminId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: newTier }),
        }
      );
      setData((prev) =>
        prev
          ? { ...prev, restaurant: { ...prev.restaurant, tier: newTier } }
          : prev
      );
    } catch {
      /* ignore */
    } finally {
      setTierChanging(false);
    }
  }

  async function handleDeactivate() {
    if (!adminId || !data) return;
    setDeactivating(true);
    try {
      await fetch(
        `/api/master/restaurants/${id}?adminId=${encodeURIComponent(adminId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "inactive" }),
        }
      );
      setData((prev) =>
        prev
          ? {
              ...prev,
              restaurant: { ...prev.restaurant, status: "inactive" },
            }
          : prev
      );
    } catch {
      /* ignore */
    } finally {
      setDeactivating(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/master"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={14} />
          Back
        </Link>
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-[#f0dbc8]/60" />
        <div className="h-6 w-64 animate-pulse rounded-lg bg-[#f0dbc8]/60" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-[#f0dbc8]/40"
            />
          ))}
        </div>
      </div>
    );
  }

  const r = data.restaurant;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/master"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={14} />
            Back to Overview
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-800">{r.name}</h1>
            <TierBadge tier={r.tier} />
            <StatusBadge status={r.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.tables.length > 1 && (
            <div className="relative">
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm"
              >
                {data.tables.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    Table {t.tableNumber}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>
          )}
          <Link
            href={selectedTable ? `/table/${selectedTable}/menu` : "#"}
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-[#062946] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a3a5e]"
          >
            <ExternalLink size={14} />
            Open Guest Menu
          </Link>
        </div>
      </div>

      {/* Info Section */}
      <section className="rounded-xl border border-[#e3c8af]/30 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Info
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={<Mail size={15} />} label="Owner email">
            {r.ownerEmail || "—"}
          </InfoRow>
          <InfoRow icon={<CreditCard size={15} />} label="Plan">
            {PLAN_LABELS[r.plan] || r.plan}
          </InfoRow>
          <InfoRow icon={<DollarSign size={15} />} label="Currency">
            {r.currency}
          </InfoRow>
          <InfoRow icon={<Calendar size={15} />} label="Created">
            {r.createdAt ? formatDate(r.createdAt) : "—"}
          </InfoRow>
          <InfoRow icon={<LayoutGrid size={15} />} label="Tables">
            {data.tables.length}
          </InfoRow>
        </div>
      </section>

      {/* Activity Section */}
      <section className="rounded-xl border border-[#e3c8af]/30 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<ShoppingCart size={15} />}
            label="Total orders"
            value={String(data.overview.totalOrders)}
          />
          <StatCard
            icon={<DollarSign size={15} />}
            label="Revenue"
            value={formatCurrency(
              data.overview.revenue,
              r.currency as Currency
            )}
          />
          <StatCard
            icon={<Clock size={15} />}
            label="Last order"
            value="N/A"
          />
        </div>
      </section>

      {/* Actions Section */}
      <section className="rounded-xl border border-[#e3c8af]/30 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Actions
        </h2>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Change tier
            </label>
            <select
              value={r.tier}
              disabled={tierChanging}
              onChange={(e) =>
                handleTierChange(
                  e.target.value as "self_service" | "waiter_service"
                )
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#6f3ca7]/30 disabled:opacity-50"
            >
              <option value="self_service">Tier 1 — Self-service</option>
              <option value="waiter_service">Tier 2 — Waiter-service</option>
            </select>
          </div>

          <button
            type="button"
            disabled={deactivating || r.status === "inactive"}
            onClick={handleDeactivate}
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
          >
            {deactivating
              ? "Deactivating…"
              : r.status === "inactive"
                ? "Already inactive"
                : "Deactivate"}
          </button>
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{children}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 p-4">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
