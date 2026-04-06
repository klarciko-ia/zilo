import { Suspense } from "react";
import { KitchenDisplayClient } from "@/components/kitchen-display-client";

export default function AdminKitchenPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
      <KitchenDisplayClient />
    </Suspense>
  );
}
