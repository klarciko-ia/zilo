import { Suspense } from "react";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <AdminDashboardClient />
    </Suspense>
  );
}
