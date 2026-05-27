import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getFirstPageForSurah, getSurahByNumber } from "@/lib/quran/utils";

type QuranSurahPageProps = {
  params: Promise<{
    surahNumber: string;
  }>;
};

export default async function QuranSurahPage({ params }: QuranSurahPageProps) {
  const { surahNumber } = await params;
  const parsedSurahNumber = Number(surahNumber);
  const surah = Number.isInteger(parsedSurahNumber)
    ? getSurahByNumber(parsedSurahNumber)
    : undefined;
  const firstPage = surah ? getFirstPageForSurah(surah.number) : null;

  if (surah && firstPage) {
    redirect(`/app/mushaf/${firstPage}`);
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3 text-center">
        <h1 className="text-xl font-bold text-ink">Surah page unavailable</h1>
        <p className="text-sm leading-6 text-ink/70">
          Run npm run import:mushaf to generate local mushaf page indexes, then
          return to the surah list.
        </p>
        <ButtonLink href="/app/quran" variant="secondary">
          Back to surah list
        </ButtonLink>
      </Card>
    </div>
  );
}
