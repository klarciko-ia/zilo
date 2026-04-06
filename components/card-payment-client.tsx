"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { decodeSelections } from "@/lib/payment-flow";
import { usePayment } from "@/lib/payment-context";
import { PaymentType } from "@/lib/types";
import type { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/format-currency";

type Props = {
  tableId: string;
  paymentTypeRaw: string;
  amount: number;
  itemsRaw: string | null;
  tipAmount?: number;
  currency?: string;
};

function toPaymentType(value: string): PaymentType {
  if (value === "percentage_partial") return "percentage_partial";
  if (value === "item_partial") return "item_partial";
  if (value === "split_n_partial") return "split_n_partial";
  return "full";
}

export function CardPaymentClient({ tableId, paymentTypeRaw, amount, itemsRaw, tipAmount = 0, currency = "MAD" }: Props) {
  const router = useRouter();
  const { applyPayment, getOrder, ensureOrderFromCart } = usePayment();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"redirect" | "pay">("redirect");

  const paymentType = toPaymentType(paymentTypeRaw);
  const itemSelections = decodeSelections(itemsRaw);

  const order = getOrder(tableId);
  const remaining = order?.remainingAmount ?? amount;
  const effectiveAmount = Math.min(amount, remaining);
  const total = effectiveAmount + tipAmount;
  const isFullyPaid = remaining <= 0.01;

  useEffect(() => {
    if (!order) { ensureOrderFromCart(tableId); }
  }, [order, tableId, ensureOrderFromCart]);

  useEffect(() => {
    if (isFullyPaid) {
      router.replace(`/table/${tableId}/checkout`);
      return;
    }
    const t = window.setTimeout(() => setPhase("pay"), 900);
    return () => window.clearTimeout(t);
  }, [isFullyPaid, router, tableId]);

  if (isFullyPaid) return null;

  const simulatePayment = async () => {
    const result = await applyPayment({
      tableId,
      paymentMethod: "card",
      paymentType,
      amount: effectiveAmount,
      tipAmount,
      itemSelections,
    });

    if (!result.ok) {
      setError(result.error ?? "Could not process payment.");
      setLoading(false);
      return;
    }

    router.push(
      `/table/${tableId}/checkout/success?method=card&amount=${effectiveAmount.toFixed(2)}&tip=${tipAmount.toFixed(2)}&paymentId=${result.paymentId}`
    );
  };

  const onPay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order?.orderId ?? tableId,
          amount: effectiveAmount,
          currency,
          tableSlug: tableId,
          tipAmount,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      if (data.fallback) {
        await simulatePayment();
        return;
      }

      setError("Unexpected response from payment service.");
      setLoading(false);
    } catch {
      await simulatePayment();
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <Link href={`/table/${tableId}/checkout`} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition hover:shadow-lift">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-brand">Secure card payment</h1>
      </header>

      <p className="text-sm text-slate-600">
        Simulated external provider (you would be redirected to your bank or Stripe).
      </p>

      {phase === "redirect" ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
          <p className="text-sm font-medium text-slate-700">Redirecting to payment provider…</p>
          <p className="mt-2 text-xs text-slate-500">Please wait</p>
        </div>
      ) : (
        <>
          <div className="glass-card space-y-1 rounded-2xl p-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Order amount</span>
              <span>{formatCurrency(effectiveAmount, currency as Currency)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Tip</span>
                <span>{formatCurrency(tipAmount, currency as Currency)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-2 flex justify-between">
              <span className="text-sm text-slate-600">Total charge</span>
              <span className="text-xl font-semibold">{formatCurrency(total, currency as Currency)}</span>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={onPay}
            disabled={loading}
            className="block w-full rounded-2xl bg-brand px-4 py-4 text-center font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-lift disabled:opacity-60"
          >
            {loading ? "Processing…" : `Pay ${formatCurrency(total, currency as Currency)}`}
          </button>
        </>
      )}
    </div>
  );
}
