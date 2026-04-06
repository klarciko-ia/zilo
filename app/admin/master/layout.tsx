import type { ReactNode } from "react";
import { MasterShell } from "@/components/master/master-shell";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <MasterShell>{children}</MasterShell>;
}
