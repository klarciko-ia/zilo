import { RestaurantShell } from "@/components/restaurant/restaurant-shell";

export default function RestaurantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RestaurantShell>{children}</RestaurantShell>;
}
