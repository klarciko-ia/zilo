"use client";

export const ADMIN_SESSION_KEY = "zilo_admin_session_v1";

const DEFAULT_ADMIN_EMAIL = "admin@zilo.ma";
const DEFAULT_ADMIN_PASSWORD = "admin123";

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
      window.localStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({
          ...data.admin,
          loggedInAt: new Date().toISOString(),
        })
      );
      return true;
    }
  } catch {
    /* fall through to offline check */
  }

  const ok =
    email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL &&
    password === DEFAULT_ADMIN_PASSWORD;
  if (!ok) return false;

  window.localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      email: DEFAULT_ADMIN_EMAIL,
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
