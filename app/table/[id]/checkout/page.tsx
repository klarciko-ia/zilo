import { notFound } from "next/navigation";
import { CheckoutHomeClient } from "@/components/checkout-home-client";
import { loadTableGuestContext } from "@/lib/table-guest-context";

export default async function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await loadTableGuestContext(params.id);
  if (!ctx) notFound();

  return (
    <CheckoutHomeClient
      tableId={params.id}
      guestOrderMode={ctx.guestOrderMode}
    />
  );
}
