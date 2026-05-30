import { getTranslationsForVerse } from "./get-translations-for-verse";

export async function getTranslationEntry(verseKey: string, sourceId?: string) {
  const entries = await getTranslationsForVerse(verseKey);

  if (sourceId) {
    return entries.find((entry) => entry.sourceId === sourceId) ?? null;
  }

  return entries[0] ?? null;
}
