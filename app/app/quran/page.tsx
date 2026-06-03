import { PageHeader } from "@/components/page-header";
import { PageBackButton } from "@/components/page-back-button";
import { SurahList } from "@/components/quran/surah-list";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAllSurahs, getPageIndex, getSurahFirstPages } from "@/lib/quran/utils";

export default function QuranPage() {
  const surahs = getAllSurahs();
  const firstPages = getSurahFirstPages();
  const pageIndex = getPageIndex();

  if (surahs.length === 0) {
    return (
      <div className="space-y-5">
        <PageBackButton href="/app" label="App home" />
        <PageHeader
          eyebrow="Reader"
          title="Qur'an"
          description="Generated mushaf data is required before the reader can open."
        />
        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-ink">Mushaf data missing</h2>
          <p className="text-sm leading-6 text-ink/70">
            Run npm run import:mushaf with server-only Quran Foundation credentials
            to generate the local page data.
          </p>
          <ButtonLink href="/app" variant="secondary">
            App home
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Reader"
        title="Qur'an"
        description="Choose a surah and open its first Madani mushaf page."
      />
      <SurahList firstPages={firstPages} pageIndex={pageIndex} surahs={surahs} />
    </div>
  );
}
