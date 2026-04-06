import { notFound } from "next/navigation";
import { CardPaymentClient } from "@/components/card-payment-client";

export default function CardPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { type?: string; amount?: string; items?: string; tipAmount?: string };
}) {
  const amount = Number(searchParams.amount ?? "0");
  if (!amount || amount <= 0) return notFound();

  return (
    <CardPaymentClient
      tableId={params.id}
      paymentTypeRaw={searchParams.type ?? "full"}
      amount={amount}
      itemsRaw={searchParams.items ?? null}
      tipAmount={Number(searchParams.tipAmount ?? "0")}
    />
  );
}
