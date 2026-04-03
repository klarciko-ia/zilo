import { notFound } from "next/navigation";
import { CartClient } from "@/components/cart-client";
import { sampleTables } from "@/lib/seed-data";

export default function TableCartPage({
  params
}: {
  params: { id: string };
}) {
  const table = sampleTables.find((t) => t.qrSlug === params.id);
  if (!table) return notFound();

  return <CartClient tableId={params.id} />;
}
