import { NotesManager } from "@/components/notes/notes-manager";
import { PageHeader } from "@/components/page-header";
import { getNotesForUser } from "@/lib/notes/actions";
import { getAllSurahs } from "@/lib/quran/utils";

type NotesPageProps = {
  searchParams?: Promise<{
    surah?: string;
  }>;
};

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const [resolvedSearchParams, notes, surahs] = await Promise.all([
    searchParams ?? Promise.resolve({} as { surah?: string }),
    getNotesForUser(),
    Promise.resolve(getAllSurahs()),
  ]);
  const { surah } = resolvedSearchParams;
  const initialSurahNumber = surah ? Number(surah) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Hifz journal"
        title="Notes"
        description="Capture personal cues, reflections, and review notes tied to Qur'an locations."
      />
      <NotesManager
        initialSurahNumber={
          Number.isInteger(initialSurahNumber) ? initialSurahNumber : undefined
        }
        notes={notes}
        surahs={surahs}
      />
    </div>
  );
}
