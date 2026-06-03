import { CollectionForm } from "@/components/library/collection-form";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";

export default function NewDuaPage() {
  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/duas" label="Duas" />
      <PageHeader eyebrow="Collections" title="New Dua" />
      <CollectionForm type="dua" />
    </div>
  );
}
