import { PercentagePaymentClient } from "@/components/percentage-payment-client";

export default function PercentagePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tipPercent?: string };
}) {
  return (
    <PercentagePaymentClient
      tableId={params.id}
      tipPercent={Number(searchParams.tipPercent ?? "0")}
    />
  );
}
