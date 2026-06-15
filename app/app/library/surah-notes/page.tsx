import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { SurahNoteList } from "@/components/library/surah-note-list";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs, getAyahByVerseKey } from "@/lib/quran/utils";
import { getSimilarVerseRecords } from "@/lib/similar-verses/actions";

type SurahNotesPageProps = {
  searchParams?: Promise<{ surah?: string }>;
};

export default async function SurahNotesPage({ searchParams }: SurahNotesPageProps) {
  const [{ surah }, items, ayahInsights, similarRecords, surahs] = await Promise.all([
    searchParams ?? Promise.resolve({} as { surah?: string }),
    getLibraryItemsByType("surah_note"),
    getLibraryItemsByType("ayah_insight"),
    getSimilarVerseRecords(),
    Promise.resolve(getAllSurahs()),
  ]);
  const selectedSurahNumber = Number(surah);
  const filteredItems =
    Number.isInteger(selectedSurahNumber) && selectedSurahNumber >= 1
      ? items.filter((item) => item.surahNumber === selectedSurahNumber)
      : items;
  const newHref =
    Number.isInteger(selectedSurahNumber) && selectedSurahNumber >= 1
      ? `/app/library/surah-notes/new?surah=${selectedSurahNumber}`
      : "/app/library/surah-notes/new";
  const versesByKey = Object.fromEntries(
    similarRecords
      .flatMap((record) => record.items)
      .map((item) => getAyahByVerseKey(item.verseKey))
      .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse))
      .map((verse) => [verse.verseKey, verse]),
  );

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library" label="Library" />
      <div className="flex items-start justify-between gap-3">
        <PageHeader eyebrow="Qur'an Notes" title="Surah Notes" />
        <Link
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-palm text-paper shadow-soft transition hover:bg-palm/90 focus:outline-none focus:ring-2 focus:ring-palm/25"
          href={newHref}
        >
          <Plus aria-hidden className="size-5" />
          <span className="sr-only">Add surah note</span>
        </Link>
      </div>
      <SurahNoteList
        emptyState={
          <LibraryEmptyState
            description="Create surah tags for themes, structure, and similar-verse cues."
            icon={BookOpenText}
            title="No surah tags yet"
          />
        }
        ayahInsights={ayahInsights}
        items={filteredItems}
        similarRecords={similarRecords}
        surahs={surahs}
        versesByKey={versesByKey}
      />
    </div>
  );
}
