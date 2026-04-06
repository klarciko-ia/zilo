import type { ReactNode } from "react";

export default function TableLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 py-5">
      {children}
    </main>
  );
}
