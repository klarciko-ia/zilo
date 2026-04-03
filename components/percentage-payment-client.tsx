"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePayment } from "@/lib/payment-context";

export function PercentagePaymentClient({ tableId }: { tableId: string }) {
  const { ensureOrderFromCart, getPayablePercentages, getOrder } = usePayment();
  const order = getOrder(tableId);
  const options = getPayablePercentages(tableId);
  const [customInput, setCustomInput] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!order);

  useEffect(() => {
    if (order) return;
    let cancelled = false;
    ensureOrderFromCart(tableId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [ensureOrderFromCart, order, tableId]);

  const remaining = order?.remainingAmount ?? 0;

  const customAmount = useMemo(() => {
    const n = parseFloat(customInput.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Number(n.toFixed(2));
  }, [customInput]);

  const customHref =
    customAmount != null && customAmount > 0 && customAmount <= remaining + 0.001
      ? `/table/${tableId}/checkout/method?type=percentage_partial&amount=${customAmount.toFixed(2)}`
      : null;

  const onCustomContinue = () => {
    setCustomError(null);
    if (customAmount == null) {
      setCustomError("Enter a valid amount.");
      return;
    }
    if (customAmount > remaining + 0.001) {
      setCustomError(`Maximum is ${remaining.toFixed(2)} MAD.`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-500">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Pay by percentage</h1>
        <p className="text-sm text-slate-600">No order available yet.</p>
        <Link
          href={`/table/${tableId}/checkout`}
          className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
        >
          Back to checkout
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pay by percentage</h1>
      <p className="text-sm text-slate-600">
        Remaining balance: <span className="font-medium">{remaining.toFixed(2)} MAD</span>
      </p>

      <div className="space-y-2">
        {options.map((option) => (
          <Link
            key={option.percent}
            href={`/table/${tableId}/checkout/method?type=percentage_partial&amount=${option.amount.toFixed(2)}`}
            className="block rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{option.label}</span>
              <span>{option.amount.toFixed(2)} MAD</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <label htmlFor="custom-amount" className="text-sm font-medium text-slate-800">
          Custom amount (MAD)
        </label>
        <input
          id="custom-amount"
          inputMode="decimal"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
          placeholder={`Max ${remaining.toFixed(2)}`}
          value={customInput}
          onChange={(e) => {
            setCustomInput(e.target.value);
            setCustomError(null);
          }}
        />
        {customError ? <p className="mt-2 text-sm text-red-600">{customError}</p> : null}
        {customHref ? (
          <Link
            href={customHref}
            onClick={(e) => {
              if (customAmount != null && customAmount > remaining + 0.001) {
                e.preventDefault();
                setCustomError(`Maximum is ${remaining.toFixed(2)} MAD.`);
              }
            }}
            className="mt-3 block rounded-xl bg-brand px-4 py-3 text-center text-sm font-medium text-white"
          >
            Continue with {customAmount?.toFixed(2)} MAD
          </Link>
        ) : (
          <button
            type="button"
            onClick={onCustomContinue}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-500"
          >
            Enter an amount to continue
          </button>
        )}
      </div>

      <Link
        href={`/table/${tableId}/checkout`}
        className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
      >
        Back
      </Link>
    </div>
  );
}
