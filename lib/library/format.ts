import { type LibraryItem } from "./types";

export function formatLibraryReference(
  item: Pick<
    LibraryItem,
    "ayahEnd" | "ayahStart" | "surahNumber" | "type" | "verseKey"
  >,
  surahName?: string,
) {
  const name = surahName ?? (item.surahNumber ? `Surah ${item.surahNumber}` : "Library item");

  if (item.type === "surah_note") {
    return `Surah ${name}`;
  }

  if (item.ayahStart && item.ayahEnd && item.ayahEnd !== item.ayahStart) {
    return `${name} ${item.surahNumber}:${item.ayahStart}-${item.surahNumber}:${item.ayahEnd}`;
  }

  if (item.verseKey) {
    return `${name} ${item.verseKey}`;
  }

  if (item.surahNumber && item.ayahStart) {
    return `${name} ${item.surahNumber}:${item.ayahStart}`;
  }

  return name;
}

export function formatLibraryDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}
