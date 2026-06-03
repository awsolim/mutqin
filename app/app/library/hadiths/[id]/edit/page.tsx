import { notFound } from "next/navigation";
import { CollectionForm } from "@/components/library/collection-form";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";
import { getLibraryItemById } from "@/lib/library/actions";

type EditHadithPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditHadithPage({ params }: EditHadithPageProps) {
  const { id } = await params;
  const item = await getLibraryItemById(id, "hadith");

  if (!item) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/hadiths" label="Hadiths" />
      <PageHeader eyebrow="Collections" title="Edit Hadith" />
      <CollectionForm item={item} type="hadith" />
    </div>
  );
}
