import { Plus, Sparkles } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { PageBackButton } from "@/components/page-back-button";
import { PageHeader } from "@/components/page-header";
import { SimilarVersesCatalog } from "@/components/similar-verses/similar-verses-catalog";
import { ButtonLink } from "@/components/ui/button";
import { getAyahByVerseKey } from "@/lib/quran/utils";
import { getSimilarVerseRecords } from "@/lib/similar-verses/actions";

export default async function SimilarVersesPage() {
  const records = await getSimilarVerseRecords();
  const versesByKey = Object.fromEntries(
    records
      .flatMap((record) => record.items)
      .map((item) => getAyahByVerseKey(item.verseKey))
      .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse))
      .map((verse) => [verse.verseKey, verse]),
  );

  return (
    <div className="space-y-5">
      <PageBackButton href="/app/library" label="Library" />
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Qur'an Notes"
          title="Similar Verses Catalog"
        />
        <ButtonLink className="mt-5 h-10 min-h-10 shrink-0 rounded-2xl px-3" href="/app/library/similar-verses/new">
          <Plus aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">New</span>
        </ButtonLink>
      </div>

      {records.length ? (
        <SimilarVersesCatalog records={records} versesByKey={versesByKey} />
      ) : (
        <div className="space-y-3">
          <LibraryEmptyState
            description="Create a record, attach the ayat you mix up, then color the shared wording and the key differences."
            icon={Sparkles}
            title="No saved records yet"
          />
        </div>
      )}
    </div>
  );
}
