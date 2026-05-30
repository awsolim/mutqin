import { SimilarVersesEditor } from "@/components/similar-verses/similar-verses-editor";
import { getAllSurahs, getAyahByVerseKey } from "@/lib/quran/utils";
import { getSimilarVersesDemoRecord } from "@/lib/similar-verses/demo";

type NewSimilarVersesPageProps = {
  searchParams?: Promise<{
    demo?: string;
    verseKey?: string;
  }>;
};

export default async function NewSimilarVersesPage({
  searchParams,
}: NewSimilarVersesPageProps) {
  const { demo, verseKey } = (await searchParams) ?? {};
  const demoRecord = getSimilarVersesDemoRecord(demo);
  const initialVerse = verseKey ? getAyahByVerseKey(verseKey) : null;

  return (
    <SimilarVersesEditor
      initialFamilyTitle={demoRecord?.familyTitle}
      initialHighlights={demoRecord?.highlights.map((highlight, index) => ({
        endWordPosition: highlight.endWordPosition,
        id: `demo-highlight-${index}`,
        label: highlight.label,
        note: highlight.note ?? undefined,
        startWordPosition: highlight.startWordPosition,
        type: highlight.type,
        verseKey: highlight.verseKey,
      }))}
      initialNote={demoRecord?.note}
      initialTitle={demoRecord?.title}
      initialVerse={initialVerse}
      initialVerses={demoRecord?.items}
      surahs={getAllSurahs()}
    />
  );
}
