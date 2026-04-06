import { MasterCustomerDetail } from "@/components/master/master-customer-detail";

export default function MasterRestaurantDetailPage({ params }: { params: { id: string } }) {
  return <MasterCustomerDetail id={params.id} />;
}
