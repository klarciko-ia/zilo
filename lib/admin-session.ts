"use client";

import { ADMIN_SESSION_KEY } from "@/lib/admin-auth";
import type { AdminRole } from "@/lib/types";

export type AdminSession = {
  id: string;
  email: string;
  restaurantId: string | null;
  role: AdminRole;
  loggedInAt?: string;
};

/** Parse admin session from localStorage (client only). */
export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const email = typeof o.email === "string" ? o.email : "";
    if (!id || !email) return null;
    const role: AdminRole =
      o.role === "super_admin"
        ? "super_admin"
        : o.role === "restaurant_owner"
          ? "restaurant_owner"
          : o.role === "restaurant_staff"
            ? "restaurant_staff"
            : "restaurant_admin";
    const restaurantId =
      o.restaurantId === null || o.restaurantId === undefined
        ? null
        : typeof o.restaurantId === "string"
          ? o.restaurantId
          : null;
    return {
      id,
      email,
      restaurantId,
      role,
      loggedInAt:
        typeof o.loggedInAt === "string" ? o.loggedInAt : undefined,
    };
  } catch {
    return null;
  }
}

export function isSuperAdmin(session: AdminSession | null): boolean {
  return session?.role === "super_admin";
}
