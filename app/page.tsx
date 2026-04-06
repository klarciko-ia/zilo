import Link from "next/link";

const venues = [
  {
    name: "Zilo Cafe",
    tables: [
      { slug: "1", label: "Table 1" },
      { slug: "2", label: "Table 2" },
      { slug: "3", label: "Table 3" },
    ],
  },
  {
    name: "7AM",
    note: "Seed: Tier 1 (self-order) by default — change in /admin/master/restaurants as owner.",
    tables: [
      { slug: "7am-1", label: "Table 1" },
      { slug: "7am-2", label: "Table 2" },
    ],
  },
  {
    name: "Open House",
    note: "Seed: Tier 2 (waiter / browse-only) by default — change in /admin/master/restaurants as owner.",
    tables: [
      { slug: "openhouse-1", label: "Table 1" },
      { slug: "openhouse-2", label: "Table 2" },
    ],
  },
] as const;

const adminLinks = [
  { href: "/master/login", title: "Master Login", desc: "owner@zilo.ma / owner123 — SaaS admin console" },
  { href: "/restaurant/login", title: "Restaurant Login", desc: "admin@zilo.ma / admin123 — restaurant staff dashboard" },
  { href: "/admin/master", title: "Master Console", desc: "Overview, Customers, Billing, Analytics" },
  { href: "/admin/master/restaurants", title: "Customers", desc: "All restaurants — add, edit tier, view details" },
  { href: "/admin/dashboard", title: "Restaurant Dashboard", desc: "Tables & payments (after restaurant login)" },
  { href: "/admin/kitchen", title: "Kitchen", desc: "Kitchen display" },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-md space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand">
          Zilo Restaurant MVP
        </h1>
        <p className="text-sm text-slate-600">
          Hub local : plusieurs <span className="font-medium text-slate-800">restaurants</span>{" "}
          sont dans le seed (<code className="rounded bg-slate-100 px-1 text-xs">supabase/seed.sql</code>
          ). Chaque lien QR (slug) ouvre le menu / hub pour{" "}
          <em>ce</em> restaurant.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Staff / admin
        </h2>
        <ul className="space-y-2">
          {adminLinks.map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className="block rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 backdrop-blur-sm transition hover:border-coral-mid/50"
              >
                <span className="font-semibold text-brand">{a.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{a.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Owner : <code className="rounded bg-slate-100 px-1">owner@zilo.ma</code> /{" "}
          <code className="rounded bg-slate-100 px-1">owner123</code> · Staff Zilo Cafe :{" "}
          <code className="rounded bg-slate-100 px-1">admin@zilo.ma</code> /{" "}
          <code className="rounded bg-slate-100 px-1">admin123</code>
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Invité (QR par restaurant)
        </h2>
        {venues.map((v) => (
          <div key={v.name} className="space-y-2">
            <h3 className="text-sm font-semibold text-brand">{v.name}</h3>
            {"note" in v && v.note ? (
              <p className="text-xs text-slate-500">{v.note}</p>
            ) : null}
            <ul className="space-y-2">
              {v.tables.map((tb) => (
                <li key={tb.slug}>
                  <Link
                    href={`/table/${tb.slug}`}
                    className="block rounded-xl bg-brand px-4 py-3 text-center font-semibold text-white shadow-lg shadow-brand/25 transition hover:shadow-lift"
                  >
                    {v.name} · {tb.label}
                    <span className="mt-1 block text-xs font-normal text-white/90">
                      QR slug <code className="text-white/95">{tb.slug}</code> ·{" "}
                      <span className="underline-offset-2">menu</span> via ce lien
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
