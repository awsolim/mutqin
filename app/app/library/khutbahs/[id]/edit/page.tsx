import { notFound } from "next/navigation";
import { KhutbahBuilder } from "@/components/library/khutbah-builder";
import { getStringMeta, getTags } from "@/components/library/collection-utils";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemById, getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs } from "@/lib/quran/utils";

type EditKhutbahPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditKhutbahPage({ params }: EditKhutbahPageProps) {
  const { id } = await params;
  const [item, khutbahs, hadiths, surahs] = await Promise.all([
    getLibraryItemById(id, "khutbah"),
    getLibraryItemsByType("khutbah"),
    getLibraryItemsByType("hadith"),
    Promise.resolve(getAllSurahs()),
  ]);

  if (!item) {
    notFound();
  }

  const templates = khutbahs.filter((candidate) => getStringMeta(candidate, "khutbahKind") === "template");
  const pieces = khutbahs.filter((candidate) => getStringMeta(candidate, "khutbahKind") === "piece");
  const existingTags = Array.from(new Set(khutbahs.flatMap(getTags)));

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library/khutbahs" label="Khutbahs" />
      <PageHeader eyebrow="Collections" title="Edit Khutbah" />
      <KhutbahBuilder
        existingTags={existingTags}
        hadiths={hadiths}
        item={item}
        pieces={pieces}
        surahs={surahs}
        templates={templates}
      />
    </div>
  );
}
