import { BookMarked } from "lucide-react";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { LibraryItemList } from "@/components/library/library-item-list";
import { PageHeader } from "@/components/page-header";
import { getLibraryItemsByType } from "@/lib/library/actions";
import { getAllSurahs, getVerseTextByKey } from "@/lib/quran/utils";

export default async function BookmarksPage() {
  const [items, surahs] = await Promise.all([
    getLibraryItemsByType("bookmark"),
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
        title="Bookmarks"
        description="Saved ayat for quick return to memorization, review, and reflection."
      />
      <LibraryItemList
        emptyState={
          <LibraryEmptyState
            description="Long-press an ayah in the mushaf and tap Bookmark to save it here."
            icon={BookMarked}
            title="No bookmarks yet"
          />
        }
        items={enrichedItems}
        kind="bookmark"
        surahs={surahs}
      />
    </div>
  );
}
