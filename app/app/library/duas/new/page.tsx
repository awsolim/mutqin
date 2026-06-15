import { CollectionForm } from "@/components/library/collection-form";
import { getTags } from "@/components/library/collection-utils";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";
import { getLibraryItemsByType } from "@/lib/library/actions";

export default async function NewDuaPage() {
  const items = await getLibraryItemsByType("dua");
  const existingTags = Array.from(new Set(items.flatMap(getTags)));

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/duas" label="Duas" />
      <PageHeader eyebrow="Collections" title="New Dua" />
      <CollectionForm existingTags={existingTags} type="dua" />
    </div>
  );
}
