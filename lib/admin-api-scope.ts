import type { AdminRow } from "@/lib/admin-server";

/**
 * restaurant_admin → always their venue.
 * super_admin + ?restaurantId= → filter to that venue (optional).
 */
export function restaurantFilterForAdmin(
  admin: AdminRow,
  restaurantIdParam: string | null
): string | null {
  if (admin.role === "restaurant_admin" && admin.restaurantId) {
    return admin.restaurantId;
  }
  if (admin.role === "super_admin" && restaurantIdParam) {
    return restaurantIdParam;
  }
  return null;
}
