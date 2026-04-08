"use client";

import {
  MASTER_SESSION_KEY,
  RESTAURANT_SESSION_KEY,
  ADMIN_SESSION_KEY,
} from "@/lib/admin-auth";
import type { AdminRole } from "@/lib/types";

export type AdminSession = {
  id: string;
  email: string;
  restaurantId: string | null;
  role: AdminRole;
  loggedInAt?: string;
};

function parseSession(raw: string | null): AdminSession | null {
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

/** Get master admin session (SaaS owner). */
export function getMasterSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  return (
    parseSession(window.localStorage.getItem(MASTER_SESSION_KEY)) ??
    parseLegacy("super_admin")
  );
}

/** Get restaurant admin session (owner/staff). */
export function getRestaurantSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  return (
    parseSession(window.localStorage.getItem(RESTAURANT_SESSION_KEY)) ??
    parseLegacy("restaurant")
  );
}

/** Generic getter — tries both keys, prefers matching context. */
export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  return (
    parseSession(window.localStorage.getItem(MASTER_SESSION_KEY)) ??
    parseSession(window.localStorage.getItem(RESTAURANT_SESSION_KEY)) ??
    parseSession(window.localStorage.getItem(ADMIN_SESSION_KEY))
  );
}

export function isSuperAdmin(session: AdminSession | null): boolean {
  return session?.role === "super_admin";
}

function parseLegacy(want: "super_admin" | "restaurant"): AdminSession | null {
  const legacy = parseSession(
    window.localStorage.getItem(ADMIN_SESSION_KEY)
  );
  if (!legacy) return null;
  if (want === "super_admin" && legacy.role === "super_admin") return legacy;
  if (want === "restaurant" && legacy.role !== "super_admin") return legacy;
  return null;
}
