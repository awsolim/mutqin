import { CollectionList } from "@/components/library/collection-list";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";

export default async function DuasPage() {
  const items = await getLibraryItemsByType("dua");

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Collections" title="Duas" />
      <CollectionList items={items} type="dua" />
    </div>
  );
}
