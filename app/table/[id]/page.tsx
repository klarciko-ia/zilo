import { notFound } from "next/navigation";
import { TableLandingClient } from "@/components/table-landing-client";
import { loadTableGuestContext } from "@/lib/table-guest-context";

export default async function TablePage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  return (
    <TableLandingClient
      tableId={params.id}
      restaurantName={ctx.restaurantName}
      tableNumber={ctx.tableNumber}
      venueFlow={ctx.venueFlow}
      guestOrderMode={ctx.guestOrderMode}
    />
  );
}
