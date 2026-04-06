import { notFound } from "next/navigation";
import { PaymentMethodClient } from "@/components/payment-method-client";

export default function PaymentMethodPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { type?: string; amount?: string; items?: string; tipPercent?: string; tipAmount?: string };
}) {
  const amount = Number(searchParams.amount ?? "0");
  if (!amount || amount <= 0) return notFound();

  return (
    <PaymentMethodClient
      tableId={params.id}
      paymentType={searchParams.type ?? "full"}
      amount={amount}
      itemsRaw={searchParams.items ?? null}
      tipAmount={Number(searchParams.tipAmount ?? "0")}
    />
  );
}
