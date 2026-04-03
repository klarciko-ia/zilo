import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Zilo Restaurant MVP</h1>
      <p className="text-sm text-slate-600">
        Demo QR routes are pre-seeded for tables 1 to 3.
      </p>
      <div className="space-y-2">
        <Link
          className="block rounded-xl bg-brand px-4 py-3 text-center font-medium text-white"
          href="/table/1"
        >
          Open Table 1
        </Link>
        <Link
          className="block rounded-xl border border-slate-300 px-4 py-3 text-center font-medium"
          href="/table/2"
        >
          Open Table 2
        </Link>
      </div>
    </div>
  );
}
