import { ReviewClient } from "@/components/review-client";

export default function ReviewPage({
  params,
}: {
  params: { id: string };
}) {
  return <ReviewClient tableId={params.id} />;
}
