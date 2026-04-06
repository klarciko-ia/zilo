"use client";

import Link from "next/link";

export function AdminLoginClient() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-800">Zilo Admin</h1>
        <p className="mt-2 text-sm text-slate-500">Choose your portal</p>
      </div>
      <div className="space-y-3">
        <Link
          href="/master/login"
          className="block rounded-xl bg-[#062946] px-6 py-4 text-center font-semibold text-white transition hover:bg-[#0a3a5e]"
        >
          Master Admin
          <span className="mt-1 block text-xs font-normal text-slate-300">
            SaaS owner console
          </span>
        </Link>
        <Link
          href="/restaurant/login"
          className="block rounded-xl border border-slate-200 bg-white px-6 py-4 text-center font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Restaurant Admin
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Restaurant staff dashboard
          </span>
        </Link>
      </div>
    </div>
  );
}
