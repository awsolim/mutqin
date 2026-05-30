import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  type Ayah,
  type MushafPage,
  type PageIndexEntry,
  type Surah,
} from "./types";

const generatedDir = path.join(process.cwd(), "lib", "quran", "generated");
const ayahCache = new Map<number, Ayah[]>();
const mushafPageCache = new Map<number, MushafPage | null>();
const verseSummariesCache = new Map<number, VerseSummary[]>();

export type VerseSummary = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  text: string;
};

function readJsonFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function getAllSurahs() {
  return readJsonFile<Surah[]>(path.join(generatedDir, "surahs.json"), []);
}

export function getSurahByNumber(surahNumber: number) {
  return getAllSurahs().find((surah) => surah.number === surahNumber);
}

export function getAyahsBySurah(surahNumber: number) {
  if (ayahCache.has(surahNumber)) {
    return ayahCache.get(surahNumber) ?? [];
  }

  const filePath = path.join(generatedDir, "chapters", `${surahNumber}.json`);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const ayahs = JSON.parse(fs.readFileSync(filePath, "utf8")) as Ayah[];
  ayahCache.set(surahNumber, ayahs);

  return ayahs;
}

export const getAyahsForSurah = getAyahsBySurah;

export function formatAyahRef(surahNumber: number, ayahNumber: number) {
  const surah = getSurahByNumber(surahNumber);
  const name = surah?.transliteratedName ?? `Surah ${surahNumber}`;

  return `${name} ${surahNumber}:${ayahNumber}`;
}

export function getMushafPage(pageNumber: number) {
  if (mushafPageCache.has(pageNumber)) {
    return mushafPageCache.get(pageNumber) ?? null;
  }

  const filePath = path.join(
    generatedDir,
    "pages",
    `page-${String(pageNumber).padStart(3, "0")}.json`,
  );
  const page = readJsonFile<MushafPage | null>(filePath, null);
  mushafPageCache.set(pageNumber, page);

  return page;
}

export function getPageIndex() {
  return readJsonFile<PageIndexEntry[]>(
    path.join(generatedDir, "page-index.json"),
    [],
  );
}

function pageCanContainSurah(page: PageIndexEntry, surahNumber: number) {
  if (page.surahNumbers.includes(surahNumber)) {
    return true;
  }

  if (!page.firstVerseKey || !page.lastVerseKey) {
    return false;
  }

  const firstVerse = parseVerseKey(page.firstVerseKey);
  const lastVerse = parseVerseKey(page.lastVerseKey);

  return surahNumber >= firstVerse.surahNumber && surahNumber <= lastVerse.surahNumber;
}

function parseVerseKey(verseKey: string) {
  const [surahNumber, ayahNumber] = verseKey.split(":").map(Number);

  return { surahNumber, ayahNumber };
}

function compareVerseKeys(a: string, b: string) {
  const verseA = parseVerseKey(a);
  const verseB = parseVerseKey(b);

  if (verseA.surahNumber !== verseB.surahNumber) {
    return verseA.surahNumber - verseB.surahNumber;
  }

  return verseA.ayahNumber - verseB.ayahNumber;
}

export function getPageForVerseKey(verseKey: string) {
  const pageIndex = getPageIndex();

  return (
    pageIndex.find(
      (page) =>
        page.firstVerseKey &&
        page.lastVerseKey &&
        compareVerseKeys(verseKey, page.firstVerseKey) >= 0 &&
        compareVerseKeys(verseKey, page.lastVerseKey) <= 0,
    )?.pageNumber ?? null
  );
}

export function getVerseTextByKey(verseKey: string) {
  const pageNumber = getPageForVerseKey(verseKey);

  if (!pageNumber) {
    return null;
  }

  const page = getMushafPage(pageNumber);

  if (!page) {
    return null;
  }

  return page.lines
    .flatMap((line) => line.words)
    .filter((word) => word.verseKey === verseKey && word.charTypeName !== "end")
    .map((word) => word.textQpcHafs ?? word.text)
    .join(" ");
}

export function getWordsForVerseKey(verseKey: string) {
  const pageNumber = getPageForVerseKey(verseKey);

  if (!pageNumber) {
    return [];
  }

  const page = getMushafPage(pageNumber);

  if (!page) {
    return [];
  }

  return page.lines
    .flatMap((line) => line.words)
    .filter((word) => word.verseKey === verseKey && word.charTypeName !== "end")
    .map((word) => ({
      text: word.textQpcHafs ?? word.text,
      wordPosition: word.wordPosition,
    }));
}

export function getVerseSummariesForSurah(surahNumber: number) {
  if (verseSummariesCache.has(surahNumber)) {
    return verseSummariesCache.get(surahNumber) ?? [];
  }

  const versesByKey = new Map<string, VerseSummary>();
  const relevantPages = getPageIndex()
    .filter((page) => pageCanContainSurah(page, surahNumber))
    .map((page) => page.pageNumber);

  for (const pageNumber of relevantPages) {
    const page = getMushafPage(pageNumber);

    if (!page?.surahNumbers.includes(surahNumber)) {
      continue;
    }

    for (const line of page.lines) {
      for (const word of line.words) {
        if (word.surahNumber !== surahNumber || word.charTypeName === "end") {
          continue;
        }

        const current = versesByKey.get(word.verseKey) ?? {
          verseKey: word.verseKey,
          surahNumber: word.surahNumber,
          ayahNumber: word.ayahNumber,
          pageNumber: word.pageNumber,
          text: "",
        };

        current.text = `${current.text}${current.text ? " " : ""}${word.text}`.trim();
        current.pageNumber = Math.min(current.pageNumber, word.pageNumber);
        versesByKey.set(word.verseKey, current);
      }
    }
  }

  const summaries = Array.from(versesByKey.values()).sort(
    (a, b) => a.ayahNumber - b.ayahNumber,
  );
  verseSummariesCache.set(surahNumber, summaries);

  return summaries;
}

export function getAyahByVerseKey(verseKey: string) {
  const parsed = parseVerseKey(verseKey);

  if (
    !Number.isInteger(parsed.surahNumber) ||
    !Number.isInteger(parsed.ayahNumber) ||
    parsed.surahNumber < 1 ||
    parsed.surahNumber > 114 ||
    parsed.ayahNumber < 1
  ) {
    return null;
  }

  const pageNumber = getPageForVerseKey(verseKey);
  const text = getVerseTextByKey(verseKey);

  if (!pageNumber || !text) {
    return null;
  }

  return {
    ayahNumber: parsed.ayahNumber,
    pageNumber,
    surahNumber: parsed.surahNumber,
    text,
    verseKey,
    words: getWordsForVerseKey(verseKey),
  };
}

export function getSurahFirstPages() {
  return readJsonFile<Record<string, number>>(
    path.join(generatedDir, "surah-first-pages.json"),
    {},
  );
}

export function getFirstPageForSurah(surahNumber: number) {
  return getSurahFirstPages()[String(surahNumber)] ?? null;
}

export function hasGeneratedMushafData() {
  return fs.existsSync(path.join(generatedDir, "surahs.json"));
}
