import { type SimilarVerseItem, type SimilarVerseRecord } from "./types";
import surahs from "@/lib/quran/generated/surahs.json";

export function formatSimilarVerseItemReference(item: Pick<SimilarVerseItem, "ayahNumber" | "surahNumber" | "verseKey">) {
  const surah = surahs.find((currentSurah) => currentSurah.number === item.surahNumber);
  const name = surah?.transliteratedName ?? `Surah ${item.surahNumber}`;

  return `${name} ${item.verseKey}`;
}

export function formatSimilarVerseRecordTitle(record: Pick<SimilarVerseRecord, "items" | "title">) {
  if (record.title?.trim()) {
    return record.title;
  }

  if (!record.items.length) {
    return "Similar verses record";
  }

  return record.items
    .slice(0, 3)
    .map(formatSimilarVerseItemReference)
    .join(" · ");
}

export function formatSimilarVerseFamily(record: Pick<SimilarVerseRecord, "familyTitle">) {
  return record.familyTitle?.trim() || null;
}

export function formatSimilarVerseDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
