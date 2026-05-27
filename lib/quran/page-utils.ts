import { type MushafPage, type MushafWord } from "./types";

export function getVerseWordsFromPage(pageData: MushafPage, verseKey: string) {
  return pageData.lines
    .flatMap((line) => line.words)
    .filter((word) => word.verseKey === verseKey);
}

export function getVerseTextFromPage(pageData: MushafPage, verseKey: string) {
  return getVerseWordsFromPage(pageData, verseKey)
    .filter((word) => word.charTypeName !== "end")
    .map((word) => word.textQpcHafs ?? word.text)
    .join(" ");
}

export function formatVerseReference(verseKey: string, surahName?: string) {
  return surahName ? `${surahName} ${verseKey}` : verseKey;
}

export function getSurahNameByNumber(
  surahNumber: number,
  surahs: Array<{ number: number; transliteratedName: string }>,
) {
  return (
    surahs.find((surah) => surah.number === surahNumber)?.transliteratedName ??
    `Surah ${surahNumber}`
  );
}

export function getWordSelection(word: MushafWord, pageData: MushafPage) {
  return {
    verseKey: word.verseKey,
    surahNumber: word.surahNumber,
    ayahNumber: word.ayahNumber,
    pageNumber: pageData.pageNumber,
    text: getVerseTextFromPage(pageData, word.verseKey),
  };
}
