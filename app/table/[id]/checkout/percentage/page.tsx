import { PercentagePaymentClient } from "@/components/percentage-payment-client";

export default function PercentagePage({
  params,
}: {
  params: { id: string };
}) {
  return <PercentagePaymentClient tableId={params.id} />;
}
