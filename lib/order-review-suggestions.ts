import type { CartLine, MenuItem } from "@/lib/types";

/**
 * Picks catalog items not already in the cart: first from the same categories
 * as cart lines, then fills from the rest (MVP stand-in for co-purchase data).
 */
export function getAlsoLikeMenuItems(
  cartLines: CartLine[],
  catalog: MenuItem[],
  limit = 4
): MenuItem[] {
  if (!cartLines.length || !catalog.length) return [];

  const inCart = new Set(cartLines.map((l) => l.menuItemId));
  const categoryIds = new Set<string>();
  for (const line of cartLines) {
    const found = catalog.find((i) => i.id === line.menuItemId);
    if (found) categoryIds.add(found.categoryId);
  }

  const pick = (pred: (i: MenuItem) => boolean) =>
    catalog.filter(
      (i) => i.isAvailable && !inCart.has(i.id) && pred(i)
    );

  const sameCategory = pick((i) => categoryIds.has(i.categoryId));
  const rest = pick((i) => !categoryIds.has(i.categoryId));

  const out: MenuItem[] = [];
  for (const i of sameCategory) {
    if (out.length >= limit) break;
    out.push(i);
  }
  for (const i of rest) {
    if (out.length >= limit) break;
    if (!out.some((x) => x.id === i.id)) out.push(i);
  }
  return out;
}
