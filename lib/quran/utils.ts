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
