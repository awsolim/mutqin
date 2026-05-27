import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MushafReaderShell } from "@/components/quran/mushaf-reader-shell";
import { getQcfV2FontName, getQcfV2FontUrl } from "@/lib/quran/font";
import { getAllSurahs, getMushafPage } from "@/lib/quran/utils";

type MushafPageProps = {
  params: Promise<{
    page: string;
  }>;
  searchParams?: Promise<{
    ayah?: string;
  }>;
};

export default async function MushafPage({ params, searchParams }: MushafPageProps) {
  const { page } = await params;
  const { ayah } = (await searchParams) ?? {};
  const pageNumber = Number(page);
  const isValidPage = Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604;

  if (!isValidPage) {
    return (
      <div className="space-y-5">
        <Card className="space-y-3 text-center">
          <h1 className="text-xl font-bold text-ink">Page not found</h1>
          <p className="text-sm leading-6 text-ink/70">
            Choose a Madani mushaf page from 1 to 604.
          </p>
          <ButtonLink href="/app/mushaf/1" variant="secondary">
            Open page 1
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const mushafPage = getMushafPage(pageNumber);
  const surahs = getAllSurahs();

  if (!mushafPage) {
    return (
      <div className="space-y-5">
        <Card className="space-y-3">
          <h1 className="text-xl font-bold text-ink">Mushaf page data missing</h1>
          <p className="text-sm leading-6 text-ink/70">
            Run npm run import:mushaf with Quran Foundation credentials to generate
            local JSON for all 604 pages.
          </p>
          <ButtonLink href="/app/quran" variant="secondary">
            Back to surah list
          </ButtonLink>
        </Card>
      </div>
    );
  }

  return (
    <>
      <MushafFontResources pageNumber={pageNumber} />
      <MushafReaderShell
        initialPage={mushafPage}
        initialVerseKey={ayah}
        surahs={surahs}
      />
    </>
  );
}

function MushafFontResources({ pageNumber }: { pageNumber: number }) {
  const pagesToWarm = [
    pageNumber,
    pageNumber + 1,
    pageNumber - 1,
    pageNumber + 2,
    pageNumber - 2,
  ].filter(
    (page) => page >= 1 && page <= 604,
  );

  return (
    <>
      {pagesToWarm.map((page) => (
        <link
          as="font"
          crossOrigin="anonymous"
          href={getQcfV2FontUrl(page)}
          key={`preload-${page}`}
          rel={page === pageNumber ? "preload" : "prefetch"}
          type="font/woff2"
        />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: pagesToWarm
            .map(
              (page) => `
@font-face {
  font-family: '${getQcfV2FontName(page)}';
  src: url('${getQcfV2FontUrl(page)}') format('woff2');
  font-display: block;
}`,
            )
            .join("\n"),
        }}
      />
    </>
  );
}

export function generateStaticParams() {
  return Array.from({ length: 604 }, (_, index) => ({
    page: String(index + 1),
  }));
}
