import { SurahNoteForm } from "@/components/library/surah-note-form";
import { PageHeader } from "@/components/page-header";
import { getAllSurahs } from "@/lib/quran/utils";

type NewSurahNotePageProps = {
  searchParams?: Promise<{ surah?: string }>;
};

export default async function NewSurahNotePage({ searchParams }: NewSurahNotePageProps) {
  const [{ surah }, surahs] = await Promise.all([
    searchParams ?? Promise.resolve({} as { surah?: string }),
    Promise.resolve(getAllSurahs()),
  ]);
  const requestedSurah = Number(surah);
  const initialSurahNumber =
    Number.isInteger(requestedSurah) && requestedSurah >= 1 && requestedSurah <= 114
      ? requestedSurah
      : 1;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Qur'an Notes" title="New Surah Tag" />
      <SurahNoteForm initialSurahNumber={initialSurahNumber} surahs={surahs} />
    </div>
  );
}
