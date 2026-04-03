import { MenuCategory, MenuItem, RestaurantTable } from "@/lib/types";

export const sampleRestaurant = {
  id: "resto_1",
  name: "Zilo Cafe",
  googleReviewUrl: "https://g.page/r/example-review-link"
};

export const sampleTables: RestaurantTable[] = [
  { id: "table_1", tableNumber: 1, qrSlug: "1" },
  { id: "table_2", tableNumber: 2, qrSlug: "2" },
  { id: "table_3", tableNumber: 3, qrSlug: "3" }
];

export const sampleCategories: MenuCategory[] = [
  { id: "cat_drinks", name: "Drinks", sortOrder: 1 },
  { id: "cat_food", name: "Food", sortOrder: 2 },
  { id: "cat_desserts", name: "Desserts", sortOrder: 3 }
];

export const sampleMenuItems: MenuItem[] = [
  {
    id: "item_1",
    name: "Fresh Orange Juice",
    description: "Freshly pressed orange juice.",
    price: 28,
    categoryId: "cat_drinks",
    isAvailable: true
  },
  {
    id: "item_2",
    name: "Mint Tea",
    description: "Traditional Moroccan mint tea.",
    price: 18,
    categoryId: "cat_drinks",
    isAvailable: true
  },
  {
    id: "item_3",
    name: "Chicken Shawarma Plate",
    description: "Served with fries and salad.",
    price: 72,
    categoryId: "cat_food",
    isAvailable: true
  },
  {
    id: "item_4",
    name: "Beef Burger",
    description: "Beef patty, cheese, lettuce, tomato.",
    price: 68,
    categoryId: "cat_food",
    isAvailable: true
  },
  {
    id: "item_5",
    name: "Chocolate Mousse",
    description: "Rich chocolate mousse.",
    price: 34,
    categoryId: "cat_desserts",
    isAvailable: true
  }
];
