"use client";

import { type ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Users } from "lucide-react";
import { logoutAdmin } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
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
  const [session, setSession] = useState<{
    id: string;
    restaurantId: string;
    role: AdminRole;
  } | null>(null);

  useEffect(() => {
    const s = getAdminSession();
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
          {session?.role === "restaurant_owner" && (
            <button
              type="button"
              onClick={() => setStaffOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              aria-label="Staff"
            >
              <Users className="h-5 w-5" />
            </button>
          )}
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
        <>
          <ItemAvailability
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            restaurantId={session.restaurantId}
            adminId={session.id}
          />
          {session.role === "restaurant_owner" && (
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
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
