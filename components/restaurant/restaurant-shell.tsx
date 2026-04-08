"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Users, X, UtensilsCrossed, LayoutGrid, ClipboardEdit } from "lucide-react";
import { logoutRestaurant } from "@/lib/admin-auth";
import { getRestaurantSession } from "@/lib/admin-session";
import type { AdminRole } from "@/lib/types";
import { ItemAvailability } from "./item-availability";

type StaffMember = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
};

export function RestaurantShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("Restaurant Admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [session, setSession] = useState<{
    id: string;
    restaurantId: string;
    role: AdminRole;
  } | null>(null);

  useEffect(() => {
    const s = getRestaurantSession();
    if (!s || !s.restaurantId) {
      router.replace("/restaurant/login");
      return;
    }
    setSession({ id: s.id, restaurantId: s.restaurantId, role: s.role });

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
    logoutRestaurant();
    router.replace("/restaurant/login");
  }

  const canManageStaff =
    session?.role === "restaurant_owner" || session?.role === "restaurant_admin";

  return (
    <div className="flex min-h-screen bg-[#faf4ed]">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col bg-[#062946] p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
            <UtensilsCrossed size={16} />
          </div>
          <span className="text-base font-semibold text-white truncate">{restaurantName}</span>
        </div>

        <nav className="flex-1 space-y-1">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white">
            <LayoutGrid size={18} />
            Tables
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <UtensilsCrossed size={18} />
            Menu Items
          </button>
          {canManageStaff && (
            <button
              type="button"
              onClick={() => setStaffOpen(true)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <Users size={18} />
              Staff
            </button>
          )}
          {canManageStaff && (
            <button
              type="button"
              onClick={() => router.push("/admin/menu")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              <ClipboardEdit size={18} />
              Edit Menu
            </button>
          )}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Log out
        </button>
      </aside>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative z-10 flex w-[260px] flex-col bg-[#062946] p-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="mb-4 self-end text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="mb-6 flex items-center gap-2 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
                <UtensilsCrossed size={16} />
              </div>
              <span className="text-base font-semibold text-white truncate">{restaurantName}</span>
            </div>

            <nav className="flex-1 space-y-1">
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white"
              >
                <LayoutGrid size={18} />
                Tables
              </button>
              <button
                type="button"
                onClick={() => { setMobileNavOpen(false); setMenuOpen(true); }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <UtensilsCrossed size={18} />
                Menu Items
              </button>
              {canManageStaff && (
                <button
                  type="button"
                  onClick={() => { setMobileNavOpen(false); setStaffOpen(true); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Users size={18} />
                  Staff
                </button>
              )}
              {canManageStaff && (
                <button
                  type="button"
                  onClick={() => { setMobileNavOpen(false); router.push("/admin/menu"); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <ClipboardEdit size={18} />
                  Edit Menu
                </button>
              )}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <LogOut size={18} />
              Log out
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[#e3c8af] bg-white px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="text-slate-600 md:hidden"
            >
              <Menu size={22} />
            </button>
            <span className="text-sm font-medium text-slate-600 md:text-base">
              {restaurantName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-400 sm:inline">
              {session?.role === "restaurant_staff" ? "Staff" : "Owner"}
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#062946] text-xs font-semibold text-white">
              {restaurantName.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>

      {session && (
        <>
          <ItemAvailability
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            restaurantId={session.restaurantId}
            adminId={session.id}
          />
          {canManageStaff && (
            <StaffPanel
              open={staffOpen}
              onClose={() => setStaffOpen(false)}
              restaurantId={session.restaurantId}
              adminId={session.id}
            />
          )}
        </>
      )}
    </div>
  );
}

function StaffPanel({
  open,
  onClose,
  restaurantId,
  adminId,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  adminId: string;
}) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/restaurant/staff?restaurantId=${encodeURIComponent(restaurantId)}&adminId=${encodeURIComponent(adminId)}`,
        );
        if (res.ok) {
          const data = (await res.json()) as { staff?: StaffMember[] };
          if (!cancelled) setStaff(data.staff ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, adminId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/restaurant/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim(),
          restaurantId,
          adminId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create staff");
        return;
      }

      setName("");
      setEmail("");
      setPassword("");

      const listRes = await fetch(
        `/api/restaurant/staff?restaurantId=${encodeURIComponent(restaurantId)}&adminId=${encodeURIComponent(adminId)}`,
      );
      if (listRes.ok) {
        const data = (await listRes.json()) as { staff?: StaffMember[] };
        setStaff(data.staff ?? []);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div className="relative flex w-full flex-col rounded-t-2xl bg-white md:w-96 md:rounded-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-800">
            Staff Management
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-400">
              Loading staff...
            </p>
          ) : staff.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No staff accounts yet
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {staff.map((s) => (
                <li key={s.id} className="py-3">
                  <p className="text-sm font-medium text-slate-700">
                    {s.name || "Unnamed"}
                  </p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-3 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Add Staff
            </h3>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#062946] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a3d66] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Add Staff Member"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
