import { formatCurrency } from "@/lib/format-currency";
import type { Currency } from "@/lib/types";

type OwnerBannerProps = {
  revenue: number;
  orders: number;
  pendingCash: number;
  currency: string;
};

export function OwnerBanner({
  revenue,
  orders,
  pendingCash,
  currency,
}: OwnerBannerProps) {
  const cur = currency as Currency;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <Stat label="Revenue today" value={formatCurrency(revenue, cur)} />
        <Stat label="Orders today" value={String(orders)} />
        <Stat
          label="Pending cash"
          value={formatCurrency(pendingCash, cur)}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="truncate text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
