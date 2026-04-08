"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check } from "lucide-react";
import { getMasterSession } from "@/lib/admin-session";

type FormData = {
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  country: string;
  currency: string;
  numberOfTables: number;
  tier: "self_service" | "waiter_service";
};

type SummaryData = {
  name: string;
  email: string;
  tableSlugs: string[];
};

const COUNTRY_CURRENCY: Record<string, string> = {
  Canada: "CAD",
  Indonesia: "IDR",
  Morocco: "MAD",
  Other: "USD",
};

const COUNTRIES = ["Canada", "Indonesia", "Morocco", "Other"];

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");
}

export function MasterAddCustomer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<"form" | "summary">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    country: "Other",
    currency: "USD",
    numberOfTables: 5,
    tier: "self_service",
  });

  const [summary, setSummary] = useState<SummaryData | null>(null);

  function baseUrl(): string {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }

  useEffect(() => {
    if (open) {
      setStep("form");
      setForm({
        name: "",
        ownerName: "",
        ownerEmail: "",
        ownerPhone: "",
        country: "Other",
        currency: "USD",
        numberOfTables: 5,
        tier: "self_service",
      });
      setSummary(null);
      setError(null);
      setCopied(false);
    }
  }, [open]);

  const handleCountryChange = useCallback((country: string) => {
    setForm((prev) => ({
      ...prev,
      country,
      currency: COUNTRY_CURRENCY[country] ?? "USD",
    }));
  }, []);

  const updateField = useCallback(
    <K extends keyof FormData>(key: K, value: FormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      setError("Restaurant name, owner name, and email are required.");
      return;
    }

    const session = getMasterSession();
    if (!session?.id) {
      setError("No admin session.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/master/restaurants?adminId=${encodeURIComponent(session.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            ownerName: form.ownerName.trim(),
            ownerEmail: form.ownerEmail.trim(),
            ownerPhone: form.ownerPhone.trim() || undefined,
            tier: form.tier,
            currency: form.currency,
            numberOfTables: form.numberOfTables,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create restaurant");
        return;
      }

      const slug = slugify(form.name);
      const tableSlugs = Array.from(
        { length: form.numberOfTables },
        (_, i) => `${slug}-${i + 1}`
      );

      setSummary({
        name: form.name.trim(),
        email: form.ownerEmail.trim(),
        tableSlugs,
      });
      setStep("summary");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function buildCopyText(): string {
    if (!summary) return "";
    const origin = baseUrl();
    const lines = [
      `Restaurant: ${summary.name}`,
      `Login URL: ${origin}/restaurant/login`,
      `Email: ${summary.email}`,
      `Default password: restaurant123`,
      "",
      "Table links:",
      ...summary.tableSlugs.map(
        (s, i) => `  Table ${i + 1}: ${origin}/table/${s}`
      ),
    ];
    return lines.join("\n");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildCopyText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  }

  function handleDone() {
    onCreated();
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-800">
              Add Customer
            </h2>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <Field label="Restaurant name *">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
                required
              />
            </Field>

            <Field label="Owner name *">
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => updateField("ownerName", e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
                required
              />
            </Field>

            <Field label="Owner email *">
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => updateField("ownerEmail", e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
                required
              />
            </Field>

            <Field label="Owner phone">
              <input
                type="tel"
                value={form.ownerPhone}
                onChange={(e) => updateField("ownerPhone", e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Country">
                <select
                  value={form.country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Currency">
                <input
                  type="text"
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
                />
              </Field>
            </div>

            <Field label="Number of tables">
              <input
                type="number"
                min={1}
                max={200}
                value={form.numberOfTables}
                onChange={(e) =>
                  updateField(
                    "numberOfTables",
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                className="border border-slate-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-[#6f3ca7]/30 focus:outline-none"
              />
            </Field>

            <Field label="Tier">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tier"
                    value="self_service"
                    checked={form.tier === "self_service"}
                    onChange={() => updateField("tier", "self_service")}
                    className="accent-[#6f3ca7]"
                  />
                  Tier 1 — Self-service
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="tier"
                    value="waiter_service"
                    checked={form.tier === "waiter_service"}
                    onChange={() => updateField("tier", "waiter_service")}
                    className="accent-[#6f3ca7]"
                  />
                  Tier 2 — Waiter
                </label>
              </div>
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#062946] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a3a5e] disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create customer"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <Check size={20} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Customer created
                </h2>
                <p className="text-sm text-slate-500">
                  Share this info with the restaurant owner.
                </p>
              </div>
            </div>

            {summary && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <SummaryRow label="Restaurant" value={summary.name} />
                <SummaryRow
                  label="Login URL"
                  value={`${baseUrl()}/restaurant/login`}
                />
                <SummaryRow label="Email" value={summary.email} />
                <SummaryRow label="Default password" value="restaurant123" />
                <div>
                  <p className="mb-1 font-medium text-slate-600">
                    Table links
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {summary.tableSlugs.map((slug, i) => (
                      <li key={slug} className="text-slate-700">
                        Table {i + 1}:{" "}
                        <span className="text-[#6f3ca7]">
                          {baseUrl()}/table/{slug}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                {copied ? (
                  <Check size={14} className="text-emerald-600" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied!" : "Copy all info"}
              </button>
              <button
                type="button"
                onClick={handleDone}
                className="rounded-lg bg-[#062946] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a3a5e]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-medium text-slate-600">{label}: </span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}
