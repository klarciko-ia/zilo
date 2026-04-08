import fs from "fs";
import path from "path";
import type { GuestOrderMode, VenueFlow } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "demo-store.json");

export type DemoRestaurant = {
  id: string;
  name: string;
  tier: "self_service" | "waiter_service";
  status: "active" | "inactive";
  plan: "starter" | "growth" | "pro";
  planPrice: number;
  currency: string;
  paymentStatus: "paid" | "overdue";
  createdAt: string;
  ownerEmail?: string;
  venueFlow: VenueFlow;
  guestOrderMode: GuestOrderMode;
};

export type DemoTable = {
  slug: string;
  tableNumber: number;
  restaurantId: string;
};

export type DemoCredential = {
  adminId: string;
  restaurantId: string;
  email: string;
  password: string;
  role: "restaurant_admin" | "restaurant_staff";
  label: string;
};

type ItemOverride = {
  itemId: string;
  restaurantId: string;
  isAvailable: boolean;
};

type StoreData = {
  restaurants: DemoRestaurant[];
  tables: DemoTable[];
  credentials: DemoCredential[];
  itemOverrides: ItemOverride[];
};

const SEED_RESTAURANTS: DemoRestaurant[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "7AM",
    tier: "self_service",
    status: "active",
    plan: "growth",
    planPrice: 99,
    currency: "USD",
    paymentStatus: "paid",
    createdAt: "2025-12-01T08:00:00Z",
    venueFlow: "dine_in",
    guestOrderMode: "self_service",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Open House",
    tier: "waiter_service",
    status: "active",
    plan: "pro",
    planPrice: 199,
    currency: "USD",
    paymentStatus: "overdue",
    createdAt: "2026-01-15T10:00:00Z",
    venueFlow: "dine_in",
    guestOrderMode: "waiter_service",
  },
];

const SEED_TABLES: DemoTable[] = [
  { slug: "7am-1", tableNumber: 1, restaurantId: "11111111-1111-1111-1111-111111111111" },
  { slug: "7am-2", tableNumber: 2, restaurantId: "11111111-1111-1111-1111-111111111111" },
  { slug: "7am-3", tableNumber: 3, restaurantId: "11111111-1111-1111-1111-111111111111" },
  { slug: "7am-4", tableNumber: 4, restaurantId: "11111111-1111-1111-1111-111111111111" },
  { slug: "7am-5", tableNumber: 5, restaurantId: "11111111-1111-1111-1111-111111111111" },
  { slug: "openhouse-1", tableNumber: 1, restaurantId: "22222222-2222-2222-2222-222222222222" },
  { slug: "openhouse-2", tableNumber: 2, restaurantId: "22222222-2222-2222-2222-222222222222" },
  { slug: "openhouse-3", tableNumber: 3, restaurantId: "22222222-2222-2222-2222-222222222222" },
  { slug: "openhouse-4", tableNumber: 4, restaurantId: "22222222-2222-2222-2222-222222222222" },
  { slug: "openhouse-5", tableNumber: 5, restaurantId: "22222222-2222-2222-2222-222222222222" },
];

const SEED_CREDENTIALS: DemoCredential[] = [
  {
    adminId: "55555555-5555-5555-5555-555555555551",
    restaurantId: "11111111-1111-1111-1111-111111111111",
    email: "admin@7am.com",
    password: "restaurant123",
    role: "restaurant_admin",
    label: "Owner",
  },
  {
    adminId: "55555555-5555-5555-5555-555555555552",
    restaurantId: "22222222-2222-2222-2222-222222222222",
    email: "admin@openhouse.com",
    password: "restaurant123",
    role: "restaurant_admin",
    label: "Owner",
  },
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): StoreData {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw) as StoreData;
      if (Array.isArray(parsed.restaurants) && Array.isArray(parsed.tables)) {
        return {
          ...parsed,
          credentials: parsed.credentials ?? [],
          itemOverrides: parsed.itemOverrides ?? [],
        };
      }
    }
  } catch { /* corrupted – use seed */ }
  return { restaurants: [], tables: [], credentials: [], itemOverrides: [] };
}

function writeStore(data: StoreData) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getAllRestaurants(): DemoRestaurant[] {
  const stored = readStore();
  const seedIds = new Set(SEED_RESTAURANTS.map((r) => r.id));
  const extra = stored.restaurants.filter((r) => !seedIds.has(r.id));
  return [...SEED_RESTAURANTS, ...extra];
}

export function getRestaurantById(id: string): DemoRestaurant | null {
  return getAllRestaurants().find((r) => r.id === id) ?? null;
}

export function getTablesByRestaurantId(restaurantId: string): DemoTable[] {
  const stored = readStore();
  const allTables = [...SEED_TABLES, ...stored.tables];
  return allTables.filter((t) => t.restaurantId === restaurantId);
}

export function getTableBySlug(slug: string): (DemoTable & { restaurant: DemoRestaurant }) | null {
  const stored = readStore();
  const allTables = [...SEED_TABLES, ...stored.tables];
  const table = allTables.find((t) => t.slug === slug);
  if (!table) return null;
  const restaurant = getRestaurantById(table.restaurantId);
  if (!restaurant) return null;
  return { ...table, restaurant };
}

export function updateRestaurant(
  id: string,
  patch: Partial<Pick<DemoRestaurant, "tier" | "status" | "guestOrderMode">>
): DemoRestaurant | null {
  const stored = readStore();

  const seed = SEED_RESTAURANTS.find((r) => r.id === id);
  if (seed) {
    const existing = stored.restaurants.find((r) => r.id === id);
    const merged = existing ?? { ...seed };
    Object.assign(merged, patch);
    if (!existing) stored.restaurants.push(merged);
    writeStore(stored);
    return merged;
  }

  const idx = stored.restaurants.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  Object.assign(stored.restaurants[idx], patch);
  writeStore(stored);
  return stored.restaurants[idx];
}

export function addRestaurant(
  restaurant: DemoRestaurant,
  numberOfTables: number
): { restaurant: DemoRestaurant; tables: DemoTable[]; credentials: DemoCredential[] } {
  const stored = readStore();

  stored.restaurants.push(restaurant);

  const slug = restaurant.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");

  const newTables: DemoTable[] = Array.from({ length: numberOfTables }, (_, i) => ({
    slug: `${slug}-${i + 1}`,
    tableNumber: i + 1,
    restaurantId: restaurant.id,
  }));

  stored.tables.push(...newTables);

  const ownerCred: DemoCredential = {
    adminId: crypto.randomUUID(),
    restaurantId: restaurant.id,
    email: restaurant.ownerEmail ?? `admin@${slug}.com`,
    password: "restaurant123",
    role: "restaurant_admin",
    label: "Owner",
  };
  stored.credentials.push(ownerCred);

  writeStore(stored);

  return { restaurant, tables: newTables, credentials: [ownerCred] };
}

export function getCredentialsByRestaurantId(restaurantId: string): DemoCredential[] {
  const stored = readStore();
  const allCreds = [...SEED_CREDENTIALS, ...stored.credentials];
  const existing = allCreds.filter((c) => c.restaurantId === restaurantId);
  if (existing.length > 0) return existing;

  const restaurant = getRestaurantById(restaurantId);
  if (!restaurant) return [];

  const slug = restaurant.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+$/, "");

  const ownerCred: DemoCredential = {
    adminId: crypto.randomUUID(),
    restaurantId,
    email: restaurant.ownerEmail ?? `admin@${slug}.com`,
    password: "restaurant123",
    role: "restaurant_admin",
    label: "Owner",
  };
  stored.credentials.push(ownerCred);
  writeStore(stored);
  return [ownerCred];
}

export function getCredentialByEmail(email: string): DemoCredential | null {
  const stored = readStore();
  const allCreds = [...SEED_CREDENTIALS, ...stored.credentials];
  return allCreds.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function updateCredentialPassword(
  restaurantId: string,
  adminId: string,
  newPassword: string
): boolean {
  const stored = readStore();

  const seedIdx = SEED_CREDENTIALS.findIndex(
    (c) => c.restaurantId === restaurantId && c.adminId === adminId
  );
  if (seedIdx !== -1) {
    const existing = stored.credentials.find(
      (c) => c.restaurantId === restaurantId && c.adminId === adminId
    );
    if (existing) {
      existing.password = newPassword;
    } else {
      stored.credentials.push({ ...SEED_CREDENTIALS[seedIdx], password: newPassword });
    }
    writeStore(stored);
    return true;
  }

  const cred = stored.credentials.find(
    (c) => c.restaurantId === restaurantId && c.adminId === adminId
  );
  if (cred) {
    cred.password = newPassword;
    writeStore(stored);
    return true;
  }
  return false;
}

export function addCredential(cred: DemoCredential): DemoCredential {
  const stored = readStore();
  stored.credentials.push(cred);
  writeStore(stored);
  return cred;
}

export function setItemAvailability(
  restaurantId: string,
  itemId: string,
  isAvailable: boolean,
): void {
  const stored = readStore();
  const idx = stored.itemOverrides.findIndex(
    (o) => o.itemId === itemId && o.restaurantId === restaurantId,
  );
  if (idx !== -1) {
    stored.itemOverrides[idx].isAvailable = isAvailable;
  } else {
    stored.itemOverrides.push({ itemId, restaurantId, isAvailable });
  }
  writeStore(stored);
}

export function getItemOverrides(
  restaurantId: string,
): Record<string, boolean> {
  const stored = readStore();
  const map: Record<string, boolean> = {};
  for (const o of stored.itemOverrides) {
    if (o.restaurantId === restaurantId) {
      map[o.itemId] = o.isAvailable;
    }
  }
  return map;
}
