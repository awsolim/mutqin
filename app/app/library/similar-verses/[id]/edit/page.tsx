import { notFound } from "next/navigation";
import { SimilarVersesEditor } from "@/components/similar-verses/similar-verses-editor";
import { getAllSurahs, getAyahByVerseKey } from "@/lib/quran/utils";
import { getSimilarVerseRecord } from "@/lib/similar-verses/actions";

type EditSimilarVersePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSimilarVersePage({
  params,
}: EditSimilarVersePageProps) {
  const { id } = await params;
  const record = await getSimilarVerseRecord(id);

  if (!record) {
    notFound();
  }

  const verses = record.items
    .map((item) => getAyahByVerseKey(item.verseKey))
    .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse));

  return (
    <SimilarVersesEditor
      editRecordId={id}
      initialFamilyTitle={record.familyTitle ?? ""}
      initialHighlights={record.highlights.map((highlight) => ({
        endWordPosition: highlight.endWordPosition,
        id: highlight.id,
        label: highlight.label,
        note: highlight.note ?? undefined,
        startWordPosition: highlight.startWordPosition,
        type: highlight.type,
        verseKey: highlight.verseKey,
      }))}
      initialNote={record.note ?? ""}
      initialTitle={record.title ?? ""}
      initialVerses={verses}
      surahs={getAllSurahs()}
    />
  );
}
