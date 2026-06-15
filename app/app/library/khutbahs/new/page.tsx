import { KhutbahBuilder } from "@/components/library/khutbah-builder";
import { getStringMeta, getTags } from "@/components/library/collection-utils";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs } from "@/lib/quran/utils";

export default async function NewKhutbahPage() {
  const [khutbahs, hadiths, surahs] = await Promise.all([
    getLibraryItemsByType("khutbah"),
    getLibraryItemsByType("hadith"),
    Promise.resolve(getAllSurahs()),
  ]);
  const templates = khutbahs.filter((item) => getStringMeta(item, "khutbahKind") === "template");
  const pieces = khutbahs.filter((item) => getStringMeta(item, "khutbahKind") === "piece");
  const existingTags = Array.from(new Set(khutbahs.flatMap(getTags)));

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/khutbahs" label="Khutbahs" />
      <PageHeader eyebrow="Collections" title="New Khutbah" />
      <KhutbahBuilder
        existingTags={existingTags}
        hadiths={hadiths}
        pieces={pieces}
        surahs={surahs}
        templates={templates}
      />
    </div>
  );
}
