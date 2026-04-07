import { Suspense } from "react";
import { MasterCustomers } from "@/components/master/master-customers";

export default function MasterRestaurantsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Loading...</div>}>
      <MasterCustomers />
    </Suspense>
  );
}
