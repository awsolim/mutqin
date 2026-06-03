import { CollectionList } from "@/components/library/collection-list";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";

export default async function HadithsPage() {
  const items = await getLibraryItemsByType("hadith");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Collections" title="Hadiths" />
      <CollectionList items={items} type="hadith" />
    </div>
  );
}
