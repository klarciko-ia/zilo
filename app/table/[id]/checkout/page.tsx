import { CheckoutHomeClient } from "@/components/checkout-home-client";

export default function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  return <CheckoutHomeClient tableId={params.id} />;
}
