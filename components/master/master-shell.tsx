"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Home, LogOut, Menu, Users, X } from "lucide-react";
import { AdminGuard } from "@/components/admin-guard";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-session";
import { logoutAdmin } from "@/lib/admin-auth";

const NAV = [
  { href: "/admin/master", label: "Overview", icon: Home },
  { href: "/admin/master/restaurants", label: "Customers", icon: Users },
] as const;

export function MasterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const s = getAdminSession();
    if (!isSuperAdmin(s)) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navContent = (
    <>
      <div className="mb-6 flex items-center gap-2 px-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6f3ca7] text-sm font-bold text-white">
          Z
        </div>
        <span className="text-base font-semibold text-white">Zilo</span>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`crm-sidebar-item flex items-center gap-3 ${active ? "crm-sidebar-item-active" : ""}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => {
          logoutAdmin();
          router.push("/master/login");
        }}
        className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
      >
        <LogOut size={18} />
        Log out
      </button>
    </>
  );

  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="crm-sidebar hidden w-[240px] shrink-0 flex-col p-4 md:flex">
          {navContent}
        </aside>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
            <aside className="crm-sidebar relative z-10 flex w-[260px] flex-col p-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="mb-2 self-end text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
              {navContent}
            </aside>
          </div>
        )}

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-14 items-center justify-between border-b border-[#e3c8af] bg-white px-4 md:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="text-slate-600 md:hidden"
            >
              <Menu size={22} />
            </button>
            <span className="text-sm font-medium text-slate-600 md:text-base">Master Console</span>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#062946] text-xs font-semibold text-white">
                YA
              </span>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-[#faf4ed] p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
