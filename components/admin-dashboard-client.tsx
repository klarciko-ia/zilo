"use client";

import { AdminGuard } from "@/components/admin-guard";
import { logoutAdmin } from "@/lib/admin-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type AdminTable = {
  id: string;
  tableNumber: number;
  qrSlug: string;
  order: {
    id: string;
    status: string;
    totalAmount: number;
    amountPaid: number;
    amountCashPending: number;
    remainingAmount: number;
    payments: Array<{
      id: string;
      amount: number;
      paymentMethod: string;
      status: string;
    }>;
  } | null;
};

function formatStatus(status: string): string {
  switch (status) {
    case "unpaid": return "Unpaid";
    case "partially_paid": return "Partial";
    case "pending_cash": return "Pending cash";
    case "paid": return "Paid";
    default: return status;
  }
}

export function AdminDashboardClient() {
  const router = useRouter();
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tables");
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables ?? []);
      }
    } catch {
      /* offline / no supabase — tables stay empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const onLogout = () => {
    logoutAdmin();
    router.push("/admin/login");
  };

  const onConfirmCash = async (paymentId: string) => {
    setConfirming(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}/confirm`, {
        method: "POST",
      });
      if (res.ok) await fetchTables();
    } catch {
      /* ignore */
    } finally {
      setConfirming(null);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Zilo Cafe
            </p>
            <h1 className="text-xl font-semibold">Tables</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/feedback"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
            >
              Feedback
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Log out
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading tables…</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-slate-500">
            No tables found. Make sure Supabase is configured and seeded.
          </p>
        ) : (
          tables.map((t) => {
            const order = t.order;
            const paid =
              order?.payments
                .filter((p) => p.status === "completed")
                .reduce((s, p) => s + p.amount, 0) ?? 0;
            const pendingCash = order?.amountCashPending ?? 0;
            const remaining = order?.remainingAmount ?? null;
            const total = order?.totalAmount ?? null;
            const statusLabel = order ? formatStatus(order.status) : "No bill";

            const pendingCashPayments =
              order?.payments.filter(
                (p) =>
                  p.paymentMethod === "cash" &&
                  p.status === "pending_cash_confirm"
              ) ?? [];

            return (
              <section
                key={t.id}
                className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
              >
                <h2 className="text-lg font-semibold">Table {t.tableNumber}</h2>
                <p className="text-xs text-slate-500">QR id: {t.qrSlug}</p>

                {!order ? (
                  <p className="text-sm text-slate-600">
                    No active order for this table yet.
                  </p>
                ) : (
                  <>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <dt className="text-slate-600">Total</dt>
                      <dd className="text-right font-medium">
                        {total!.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Paid (confirmed)</dt>
                      <dd className="text-right font-medium">
                        {paid.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Cash pending</dt>
                      <dd className="text-right font-medium">
                        {pendingCash.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Remaining</dt>
                      <dd className="text-right font-medium">
                        {remaining!.toFixed(2)} MAD
                      </dd>
                      <dt className="text-slate-600">Status</dt>
                      <dd className="text-right font-medium">{statusLabel}</dd>
                    </dl>

                    {pendingCashPayments.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-sm font-medium text-slate-800">
                          Confirm cash received
                        </p>
                        {pendingCashPayments.map((payment) => (
                          <button
                            key={payment.id}
                            type="button"
                            disabled={confirming === payment.id}
                            onClick={() => onConfirmCash(payment.id)}
                            className="w-full rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
                          >
                            {confirming === payment.id
                              ? "Confirming…"
                              : `Confirm ${payment.amount.toFixed(2)} MAD (cash)`}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            );
          })
        )}
      </div>
    </AdminGuard>
  );
}
