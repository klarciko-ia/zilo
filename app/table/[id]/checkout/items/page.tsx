import { ItemPaymentClient } from "@/components/item-payment-client";

export default function ItemSplitPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tipPercent?: string };
}) {
  return (
    <ItemPaymentClient
      tableId={params.id}
      tipPercent={Number(searchParams.tipPercent ?? "0")}
    />
  );
}
