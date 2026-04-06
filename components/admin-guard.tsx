"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/admin-auth";

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      setRedirecting(true);
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <p className="text-sm text-slate-600">
        {redirecting ? "Redirecting to sign in…" : "Checking session…"}
      </p>
    );
  }
  return <>{children}</>;
}
