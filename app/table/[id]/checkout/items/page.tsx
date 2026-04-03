import { ItemPaymentClient } from "@/components/item-payment-client";

export default function ItemSplitPage({
  params,
}: {
  params: { id: string };
}) {
  return <ItemPaymentClient tableId={params.id} />;
}
