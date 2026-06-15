import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/library/collection-form";
import { getTags } from "@/components/library/collection-utils";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";
import { getLibraryItemById, getLibraryItemsByType } from "@/lib/library/actions";

type EditDuaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDuaPage({ params }: EditDuaPageProps) {
  const { id } = await params;
  const [item, items] = await Promise.all([
    getLibraryItemById(id, "dua"),
    getLibraryItemsByType("dua"),
  ]);

  if (!item) {
    notFound();
  }

  const existingTags = Array.from(new Set(items.flatMap(getTags)));

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/duas" label="Duas" />
      <PageHeader eyebrow="Collections" title="Edit Dua" />
      <CollectionForm existingTags={existingTags} item={item} type="dua" />
    </div>
  );
}
