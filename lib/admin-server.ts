import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole } from "@/lib/types";

export type AdminRow = {
  id: string;
  email: string;
  restaurantId: string | null;
  role: AdminRole;
};

const DEMO_OWNER_ID = "55555555-5555-5555-5555-555555555550";
const DEMO_STAFF_ID = "55555555-5555-5555-5555-555555555551";
const DEMO_RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";

const DEMO_ADMINS: Record<string, AdminRow> = {
  [DEMO_OWNER_ID]: {
    id: DEMO_OWNER_ID,
    email: "owner@zilo.ma",
    restaurantId: null,
    role: "super_admin",
  },
  [DEMO_STAFF_ID]: {
    id: DEMO_STAFF_ID,
    email: "admin@zilo.ma",
    restaurantId: DEMO_RESTAURANT_ID,
    role: "restaurant_admin",
  },
};

export async function getAdminById(
  db: SupabaseClient,
  adminId: string
): Promise<AdminRow | null> {
  const { data, error } = await db
    .from("admin_users")
    .select("id, email, restaurant_id, role")
    .eq("id", adminId)
    .maybeSingle();

  if (!error && data) {
    const roleRaw = data.role as string | null;
    const role: AdminRole =
      roleRaw === "super_admin"
        ? "super_admin"
        : roleRaw === "restaurant_owner"
          ? "restaurant_owner"
          : "restaurant_admin";

    return {
      id: data.id as string,
      email: data.email as string,
      restaurantId: (data.restaurant_id as string | null) ?? null,
      role,
    };
  }

  return DEMO_ADMINS[adminId] ?? null;
}
