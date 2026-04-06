"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";
import { getAdminSession, isSuperAdmin } from "@/lib/admin-session";

export default function MasterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@zilo.ma");
  const [password, setPassword] = useState("owner123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await loginAdmin(email, password);
    if (!ok) {
      setError("Invalid credentials.");
      setLoading(false);
      return;
    }
    const session = getAdminSession();
    if (!isSuperAdmin(session)) {
      setError("This login is for the Master Admin only.");
      setLoading(false);
      return;
    }
    router.push("/admin/master");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#062946] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Zilo</h1>
          <p className="mt-1 text-sm text-slate-300">Master Admin Console</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-xl">
          <div className="space-y-1">
            <label htmlFor="master-email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="master-email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#6f3ca7] focus:ring-2 focus:ring-[#6f3ca7]/20"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="master-password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="master-password"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-[#6f3ca7] focus:ring-2 focus:ring-[#6f3ca7]/20"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            className="w-full rounded-lg bg-[#6f3ca7] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5c2f8e] disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in as Master"}
          </button>
        </form>
      </div>
    </div>
  );
}
