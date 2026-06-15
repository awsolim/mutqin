import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/library/collection-form";
import { getTags } from "@/components/library/collection-utils";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";
import { getLibraryItemById, getLibraryItemsByType } from "@/lib/library/actions";

type EditHadithPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditHadithPage({ params }: EditHadithPageProps) {
  const { id } = await params;
  const [item, items] = await Promise.all([
    getLibraryItemById(id, "hadith"),
    getLibraryItemsByType("hadith"),
  ]);

  if (!item) {
    notFound();
  }

  const existingTags = Array.from(new Set(items.flatMap(getTags)));

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/hadiths" label="Hadiths" />
      <PageHeader eyebrow="Collections" title="Edit Hadith" />
      <CollectionForm existingTags={existingTags} item={item} type="hadith" />
    </div>
  );
}
