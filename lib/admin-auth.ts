"use client";

export const ADMIN_SESSION_KEY = "zilo_admin_session_v1";

const DEFAULT_ADMIN_EMAIL = "admin@zilo.ma";
const DEFAULT_ADMIN_PASSWORD = "admin123";
/** Matches seed `admin_users` row for Zilo Cafe (offline demo). */
const DEMO_RESTAURANT_ADMIN_ID = "55555555-5555-5555-5555-555555555551";
const DEMO_RESTAURANT_ID = "11111111-1111-1111-1111-111111111111";

const OWNER_EMAIL = "owner@zilo.ma";
const OWNER_PASSWORD = "owner123";
/** Matches seed owner row (offline demo). */
const DEMO_OWNER_ADMIN_ID = "55555555-5555-5555-5555-555555555550";

export async function loginAdmin(
  email: string,
  password: string
): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      const a = data.admin as Record<string, unknown>;
      window.localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({
          id: a.id,
          email: a.email,
          restaurantId: a.restaurantId ?? null,
          role:
            a.role === "super_admin"
              ? "super_admin"
              : a.role === "restaurant_owner"
                ? "restaurant_owner"
                : "restaurant_admin",
          loggedInAt: new Date().toISOString(),
        })
      );
      return true;
    }
  } catch {
    /* fall through to offline check */
  }

  if (normalized === OWNER_EMAIL && password === OWNER_PASSWORD) {
    window.localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        id: DEMO_OWNER_ADMIN_ID,
        email: OWNER_EMAIL,
        restaurantId: null,
        role: "super_admin",
        loggedInAt: new Date().toISOString(),
      })
    );
    return true;
  }

  const ok =
    normalized === DEFAULT_ADMIN_EMAIL &&
    password === DEFAULT_ADMIN_PASSWORD;
  if (!ok) return false;

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      id: DEMO_RESTAURANT_ADMIN_ID,
      email: DEFAULT_ADMIN_EMAIL,
      restaurantId: DEMO_RESTAURANT_ID,
      role: "restaurant_admin",
      loggedInAt: new Date().toISOString(),
    })
  );
  return true;
}

export function logoutAdmin() {
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function isAdminLoggedIn() {
  return Boolean(window.localStorage.getItem(ADMIN_SESSION_KEY));
}
