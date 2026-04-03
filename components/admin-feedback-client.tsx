"use client";

import { AdminGuard } from "@/components/admin-guard";
import Link from "next/link";
import { useEffect, useState } from "react";

type Review = {
  id: string;
  tableSlug: string | null;
  rating: number;
  feedbackText: string | null;
  createdAt: string;
};

export function AdminFeedbackClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = await res.json();
          setReviews(
            (data.reviews ?? []).filter((r: Review) => r.rating <= 3)
          );
        }
      } catch {
        /* offline */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AdminGuard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Internal feedback</h1>
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
          >
            Tables
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          Low ratings (1–3 stars) with comments. Higher ratings are nudged to Google reviews.
        </p>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-sm text-slate-600">No internal feedback yet.</p>
          </div>
        ) : (
          reviews.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
            >
              <p className="text-sm font-medium">
                {row.tableSlug ? `Table ${row.tableSlug}` : "Unknown table"} · {row.rating} / 5
              </p>
              <p className="mt-2 text-sm text-slate-800">{row.feedbackText}</p>
              <p className="mt-2 text-xs text-slate-500">
                {new Date(row.createdAt).toLocaleString()}
              </p>
            </article>
          ))
        )}
      </div>
    </AdminGuard>
  );
}
