import { notFound } from "next/navigation";
import { MenuClient } from "@/components/menu-client";
import { sampleCategories, sampleMenuItems, sampleTables } from "@/lib/seed-data";

export default function TableMenuPage({
  params
}: {
  params: { id: string };
}) {
  const table = sampleTables.find((t) => t.qrSlug === params.id);
  if (!table) return notFound();

  const sortedCategories = [...sampleCategories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <MenuClient
      tableId={params.id}
      categories={sortedCategories}
      items={sampleMenuItems}
    />
  );
}
