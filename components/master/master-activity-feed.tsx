"use client";

import { useMemo } from "react";
import { Activity, CreditCard, AlertTriangle, Plus, CheckCircle } from "lucide-react";
import type { Restaurant } from "./master-kpi-cards";

type ActivityEvent = {
  id: string;
  icon: typeof Activity;
  iconColor: string;
  message: string;
  time: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function MasterActivityFeed({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const events = useMemo(() => {
    const items: ActivityEvent[] = [];

    for (const r of restaurants) {
      if (r.paymentStatus === "overdue") {
        items.push({
          id: `${r.id}-overdue`,
          icon: AlertTriangle,
          iconColor: "text-red-500",
          message: `${r.name} — paiement en retard`,
          time: r.createdAt,
        });
      }

      if (r.paymentStatus === "paid" && r.status === "active") {
        items.push({
          id: `${r.id}-paid`,
          icon: CheckCircle,
          iconColor: "text-emerald-500",
          message: `${r.name} — paiement reçu (${r.plan})`,
          time: r.createdAt,
        });
      }

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (new Date(r.createdAt).getTime() > thirtyDaysAgo) {
        items.push({
          id: `${r.id}-new`,
          icon: Plus,
          iconColor: "text-blue-500",
          message: `${r.name} — nouveau restaurant ajouté`,
          time: r.createdAt,
        });
      }

      items.push({
        id: `${r.id}-active`,
        icon: CreditCard,
        iconColor: "text-slate-400",
        message: `${r.name} — plan ${r.plan} ($${r.planPrice}/mo)`,
        time: r.createdAt,
      });
    }

    items.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    return items.slice(0, 8);
  }, [restaurants]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-[#e3c8af]/30 p-4 md:p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
        <Activity size={16} />
        Activité récente
      </h2>

      {events.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Aucune activité récente
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((evt) => {
            const Icon = evt.icon;
            return (
              <li key={evt.id} className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon size={16} className={evt.iconColor} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{evt.message}</p>
                  <p className="text-xs text-slate-400">{timeAgo(evt.time)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
