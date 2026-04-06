import { notFound } from "next/navigation";
import { TableHubClient } from "@/components/table-hub-client";
import { loadTableGuestContext } from "@/lib/table-guest-context";

export default async function TableHubPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  return (
    <TableHubClient
      tableId={params.id}
      restaurantName={ctx.restaurantName}
      tableNumber={ctx.tableNumber}
      venueFlow={ctx.venueFlow}
      guestOrderMode={ctx.guestOrderMode}
    />
  );
}
