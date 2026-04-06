import {
  GuestOrderMode,
  MenuCategory,
  MenuItem,
  RestaurantTable,
  VenueFlow,
} from "@/lib/types";

export const sampleRestaurant = {
  id: "resto_1",
  name: "Zilo Cafe",
  googleReviewUrl: "https://g.page/r/example-review-link",
  venueFlow: "dine_in" as VenueFlow,
  guestOrderMode: "self_service" as GuestOrderMode,
};

export const sampleTables: RestaurantTable[] = [
  { id: "table_1", tableNumber: 1, qrSlug: "1" },
  { id: "table_2", tableNumber: 2, qrSlug: "2" },
  { id: "table_3", tableNumber: 3, qrSlug: "3" },
];

export const demoRestaurants = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "7AM",
    googleReviewUrl: null,
    venueFlow: "dine_in" as VenueFlow,
    guestOrderMode: "self_service" as GuestOrderMode,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Open House",
    googleReviewUrl: null,
    venueFlow: "dine_in" as VenueFlow,
    guestOrderMode: "waiter_service" as GuestOrderMode,
  },
];

export const demoTables: RestaurantTable[] = [
  { id: "7am_t1", tableNumber: 1, qrSlug: "7am-1" },
  { id: "7am_t2", tableNumber: 2, qrSlug: "7am-2" },
  { id: "7am_t3", tableNumber: 3, qrSlug: "7am-3" },
  { id: "7am_t4", tableNumber: 4, qrSlug: "7am-4" },
  { id: "7am_t5", tableNumber: 5, qrSlug: "7am-5" },
  { id: "oh_t1", tableNumber: 1, qrSlug: "openhouse-1" },
  { id: "oh_t2", tableNumber: 2, qrSlug: "openhouse-2" },
  { id: "oh_t3", tableNumber: 3, qrSlug: "openhouse-3" },
  { id: "oh_t4", tableNumber: 4, qrSlug: "openhouse-4" },
  { id: "oh_t5", tableNumber: 5, qrSlug: "openhouse-5" },
];

export const demoTableRestaurantMap: Record<string, string> = {
  "7am-1": "11111111-1111-1111-1111-111111111111",
  "7am-2": "11111111-1111-1111-1111-111111111111",
  "7am-3": "11111111-1111-1111-1111-111111111111",
  "7am-4": "11111111-1111-1111-1111-111111111111",
  "7am-5": "11111111-1111-1111-1111-111111111111",
  "openhouse-1": "22222222-2222-2222-2222-222222222222",
  "openhouse-2": "22222222-2222-2222-2222-222222222222",
  "openhouse-3": "22222222-2222-2222-2222-222222222222",
  "openhouse-4": "22222222-2222-2222-2222-222222222222",
  "openhouse-5": "22222222-2222-2222-2222-222222222222",
};

export const sampleCategories: MenuCategory[] = [
  { id: "cat_drinks", name: "Drinks", sortOrder: 1 },
  { id: "cat_food", name: "Food", sortOrder: 2 },
  { id: "cat_desserts", name: "Desserts", sortOrder: 3 },
  { id: "cat_shisha", name: "Shisha", sortOrder: 4 }
];

export const sampleMenuItems: MenuItem[] = [
  {
    id: "item_1",
    name: "Fresh Orange Juice",
    description: "Freshly pressed orange juice.",
    price: 28,
    categoryId: "cat_drinks",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_2",
    name: "Mint Tea",
    description: "Traditional Moroccan mint tea.",
    price: 18,
    categoryId: "cat_drinks",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_3",
    name: "Chicken Shawarma Plate",
    description: "Served with fries and salad.",
    price: 72,
    categoryId: "cat_food",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1561651188-d207bbec4ec3?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_4",
    name: "Beef Burger",
    description: "Beef patty, cheese, lettuce, tomato.",
    price: 68,
    categoryId: "cat_food",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_5",
    name: "Chocolate Mousse",
    description: "Rich chocolate mousse.",
    price: 34,
    categoryId: "cat_desserts",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_6",
    name: "Double Apple Shisha",
    description: "Classic double apple flavor, smooth and aromatic.",
    price: 90,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1516733968668-dbdce39c0651?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_7",
    name: "Mint Shisha",
    description: "Refreshing cool mint flavor.",
    price: 90,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1528938102132-4a9276b8e320?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_8",
    name: "Grape Shisha",
    description: "Sweet grape with a rich finish.",
    price: 90,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1496524455197-d7f846dcb852?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_9",
    name: "Lemon Mint Shisha",
    description: "Zesty lemon blended with cool mint.",
    price: 95,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_10",
    name: "Blueberry Shisha",
    description: "Sweet wild blueberry, smooth smoke.",
    price: 95,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=400&h=400&fit=crop&q=80"
  },
  {
    id: "item_11",
    name: "Premium Hookah Setup",
    description: "Large hookah with premium tobacco blend of your choice.",
    price: 150,
    categoryId: "cat_shisha",
    isAvailable: true,
    imageUrl: "https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=400&h=400&fit=crop&q=80"
  }
];
