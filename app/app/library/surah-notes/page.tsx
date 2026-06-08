import Link from "next/link";
import { BookOpenText, Plus } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { SurahNoteList } from "@/components/library/surah-note-list";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs } from "@/lib/quran/utils";

type SurahNotesPageProps = {
  searchParams?: Promise<{ surah?: string }>;
};

export default async function SurahNotesPage({ searchParams }: SurahNotesPageProps) {
  const [{ surah }, items, surahs] = await Promise.all([
    searchParams ?? Promise.resolve({} as { surah?: string }),
    getLibraryItemsByType("surah_note"),
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
            description="Use the note icon beside a surah to save bullet-point reminders here."
            icon={BookOpenText}
            title="No surah notes yet"
          />
        }
        items={filteredItems}
        surahs={surahs}
      />
    </div>
  );
}
