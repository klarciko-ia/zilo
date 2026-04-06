"use client";

import { type ReactNode, useMemo } from "react";
import { Building2, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";

export type Restaurant = {
  id: string;
  name: string;
  tier: "self_service" | "waiter_service";
  status: "active" | "inactive" | "suspended" | "cancelled";
  plan: "starter" | "growth" | "pro";
  planPrice: number;
  currency: string;
  paymentStatus: "paid" | "overdue";
  createdAt: string;
};

function KpiCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#e3c8af]/30 p-4 md:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-0.5 text-2xl font-bold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function MasterKpiCards({ restaurants }: { restaurants: Restaurant[] }) {
  const metrics = useMemo(() => {
    const active = restaurants.filter((r) => r.status === "active").length;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const newThisMonth = restaurants.filter(
      (r) => new Date(r.createdAt).getTime() > thirtyDaysAgo
    ).length;
    const mrr = restaurants
      .filter((r) => r.status === "active")
      .reduce((sum, r) => sum + Number(r.planPrice || 0), 0);
    const overdue = restaurants.filter(
      (r) => r.paymentStatus === "overdue"
    ).length;
    return { active, newThisMonth, mrr, overdue };
  }, [restaurants]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        icon={<Building2 size={20} className="text-emerald-600" />}
        iconBg="bg-emerald-50"
        label="Restaurants actifs"
        value={String(metrics.active)}
      />
      <KpiCard
        icon={<TrendingUp size={20} className="text-blue-600" />}
        iconBg="bg-blue-50"
        label="Nouveaux ce mois"
        value={String(metrics.newThisMonth)}
      />
      <KpiCard
        icon={<DollarSign size={20} className="text-[#6f3ca7]" />}
        iconBg="bg-purple-50"
        label="MRR"
        value={formatCurrency(metrics.mrr, "USD")}
      />
      <KpiCard
        icon={<AlertTriangle size={20} className="text-red-600" />}
        iconBg="bg-red-50"
        label="Impayés"
        value={String(metrics.overdue)}
      />
    </div>
  );
}
