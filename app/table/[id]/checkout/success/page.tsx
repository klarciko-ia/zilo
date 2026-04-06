import { notFound } from "next/navigation";
import { PaymentSuccessClient } from "@/components/payment-success-client";

export default function SuccessPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { amount?: string; method?: string; paymentId?: string; tip?: string };
}) {
  const amount = Number(searchParams.amount ?? "0");
  if (!amount || amount <= 0) return notFound();

  return (
    <PaymentSuccessClient
      tableId={params.id}
      amount={amount}
      method={searchParams.method ?? "card"}
      paymentId={searchParams.paymentId}
      tipAmount={Number(searchParams.tip ?? "0")}
    />
  );
}
