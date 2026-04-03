"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdmin } from "@/lib/admin-auth";

export function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@zilo.ma");
  const [password, setPassword] = useState("admin123");
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
    router.push("/admin/dashboard");
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
      >
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-slate-600">Sign in to view tables and feedback.</p>
        <div className="space-y-1">
          <label htmlFor="admin-email" className="text-sm">
            Email
          </label>
          <input
            id="admin-email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="admin-password" className="text-sm">
            Password
          </label>
          <input
            id="admin-password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Link href="/" className="block text-center text-sm text-slate-600">
        ← Home
      </Link>
    </div>
  );
}
