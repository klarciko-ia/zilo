"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";
import { PaymentType } from "@/lib/types";

type Props = {
  tableId: string;
  paymentTypeRaw: string;
  amount: number;
  itemsRaw: string | null;
};

function toPaymentType(value: string): PaymentType {
  if (value === "percentage_partial") return "percentage_partial";
  if (value === "item_partial") return "item_partial";
  return "full";
}

export function CardPaymentClient({ tableId, paymentTypeRaw, amount, itemsRaw }: Props) {
  const router = useRouter();
  const { applyPayment } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"redirect" | "pay">("redirect");

  const paymentType = toPaymentType(paymentTypeRaw);
  const itemSelections = decodeSelections(itemsRaw);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase("pay"), 900);
    return () => window.clearTimeout(t);
  }, []);

  const onSimulateSuccess = async () => {
    setLoading(true);
    setError(null);
    const result = await applyPayment({
      tableId,
      paymentMethod: "card",
      paymentType,
      amount,
      itemSelections,
    });

    if (!result.ok) {
      setError(result.error ?? "Could not process payment.");
      setLoading(false);
      return;
    }

    router.push(
      `/table/${tableId}/checkout/success?method=card&amount=${amount.toFixed(2)}&paymentId=${result.paymentId}`
    );
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Secure card payment</h1>
      <p className="text-sm text-slate-600">
        Simulated external provider (you would be redirected to your bank or Stripe, etc.).
      </p>

      {phase === "redirect" ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-700">Redirecting to payment provider…</p>
          <p className="mt-2 text-xs text-slate-500">Please wait</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm text-slate-600">Amount to charge</p>
            <p className="text-xl font-semibold">{amount.toFixed(2)} MAD</p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={onSimulateSuccess}
            disabled={loading}
            className="block w-full rounded-xl bg-brand px-4 py-3 text-center font-medium text-white disabled:opacity-60"
          >
            {loading ? "Processing…" : "Complete payment (simulated success)"}
          </button>
        </>
      )}

      <Link
        href={`/table/${tableId}/checkout/method?type=${paymentType}&amount=${amount.toFixed(2)}${itemsRaw ? `&items=${encodeURIComponent(itemsRaw)}` : ""}`}
        className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
      >
        Cancel
      </Link>
    </div>
  );
}
