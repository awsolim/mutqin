import { CollectionForm } from "@/components/library/collection-form";
import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";

export default function NewHadithPage() {
  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/hadiths" label="Hadiths" />
      <PageHeader eyebrow="Collections" title="New Hadith" />
      <CollectionForm type="hadith" />
    </div>
  );
}
