"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { ItemAvailability } from "./item-availability";

export function RestaurantShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("Restaurant Admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<{ id: string; restaurantId: string } | null>(null);

  useEffect(() => {
    const s = getAdminSession();
    if (!s || !s.restaurantId) {
      router.replace("/restaurant/login");
      return;
    }
    setSession({ id: s.id, restaurantId: s.restaurantId });

    fetch(
      `/api/restaurant/tables?restaurantId=${s.restaurantId}&adminId=${s.id}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.restaurant?.name) {
          setRestaurantName(data.restaurant.name);
        }
      })
      .catch(() => {});
  }, [router]);

  function handleLogout() {
    logoutAdmin();
    router.replace("/restaurant/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <span className="text-lg font-semibold text-slate-800">
          {restaurantName}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main>{children}</main>
      {session && (
        <ItemAvailability
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          restaurantId={session.restaurantId}
          adminId={session.id}
        />
      )}
    </div>
  );
}
