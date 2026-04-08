"use client";

export const MASTER_SESSION_KEY = "zilo_master_session_v1";
export const RESTAURANT_SESSION_KEY = "zilo_restaurant_session_v1";
/** @deprecated kept for backward compat reads during migration */
export const ADMIN_SESSION_KEY = "zilo_admin_session_v1";

export async function loginAdmin(
  email: string,
  password: string
): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      const a = data.admin as Record<string, unknown>;
      const role =
        a.role === "super_admin"
          ? "super_admin"
          : a.role === "restaurant_owner"
            ? "restaurant_owner"
            : a.role === "restaurant_staff"
              ? "restaurant_staff"
              : "restaurant_admin";

      const session = JSON.stringify({
        id: a.id,
        email: a.email,
        restaurantId: a.restaurantId ?? null,
        role,
        loggedInAt: new Date().toISOString(),
      });

      if (role === "super_admin") {
        window.localStorage.setItem(MASTER_SESSION_KEY, session);
      } else {
        window.localStorage.setItem(RESTAURANT_SESSION_KEY, session);
      }
      return true;
    }
  } catch {
    /* fall through to offline check */
  }

  const normalized = email.trim().toLowerCase();

  if (normalized === "owner@zilo.ma" && password === "owner123") {
    window.localStorage.setItem(
      MASTER_SESSION_KEY,
      JSON.stringify({
        id: "55555555-5555-5555-5555-555555555550",
        email: "owner@zilo.ma",
        restaurantId: null,
        role: "super_admin",
        loggedInAt: new Date().toISOString(),
      })
    );
    return true;
  }

  if (normalized === "admin@zilo.ma" && password === "admin123") {
    window.localStorage.setItem(
      RESTAURANT_SESSION_KEY,
      JSON.stringify({
        id: "55555555-5555-5555-5555-555555555551",
        email: "admin@zilo.ma",
        restaurantId: "11111111-1111-1111-1111-111111111111",
        role: "restaurant_admin",
        loggedInAt: new Date().toISOString(),
      })
    );
    return true;
  }

  return false;
}

export function logoutMaster() {
  window.localStorage.removeItem(MASTER_SESSION_KEY);
}

export function logoutRestaurant() {
  window.localStorage.removeItem(RESTAURANT_SESSION_KEY);
}

export function logoutAdmin() {
  window.localStorage.removeItem(MASTER_SESSION_KEY);
  window.localStorage.removeItem(RESTAURANT_SESSION_KEY);
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminLoggedIn() {
  return (
    Boolean(window.localStorage.getItem(MASTER_SESSION_KEY)) ||
    Boolean(window.localStorage.getItem(RESTAURANT_SESSION_KEY))
  );
}
