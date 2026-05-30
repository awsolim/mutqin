import { Lightbulb } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { LibraryItemList } from "@/components/library/library-item-list";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs, getVerseTextByKey } from "@/lib/quran/utils";

export default async function AyahInsightsPage() {
  const [items, surahs] = await Promise.all([
    getLibraryItemsByType("ayah_insight"),
    Promise.resolve(getAllSurahs()),
  ]);
  const enrichedItems = items.map((item) => ({
    ...item,
    arabicPreview: item.verseKey ? getVerseTextByKey(item.verseKey) : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Qur'an Notes"
        title="Ayah Insights"
        description="Personal reflections, hifz cues, and meanings saved from selected ayat."
      />
      <LibraryItemList
        emptyState={
          <LibraryEmptyState
            description="Long-press an ayah in the mushaf, tap Note, then save an Ayah Insight."
            icon={Lightbulb}
            title="No ayah insights yet"
          />
        }
        items={enrichedItems}
        kind="ayah_insight"
        surahs={surahs}
      />
    </div>
  );
}
