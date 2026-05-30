import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type TranslationEntry,
  type TranslationSource,
  type TranslationSurahFile,
} from "./types";

const generatedRoot = path.join(process.cwd(), "lib", "translations", "generated");
let sourcesCache: Promise<TranslationSource[]> | null = null;
const sourceSurahCache = new Map<string, Promise<TranslationEntry[]>>();

async function getSources(): Promise<TranslationSource[]> {
  if (sourcesCache) {
    return sourcesCache;
  }

  sourcesCache = (async () => {
    try {
      const file = await readFile(path.join(generatedRoot, "sources.json"), "utf8");
      return JSON.parse(file) as TranslationSource[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  })();

  return sourcesCache;
}

async function readSourceSurah(sourceId: string, surahNumber: number) {
  const cacheKey = `${sourceId}:${surahNumber}`;

  if (sourceSurahCache.has(cacheKey)) {
    return sourceSurahCache.get(cacheKey) ?? Promise.resolve([]);
  }

  const readPromise = (async () => {
    const filePath = path.join(
      generatedRoot,
      "sources",
      sourceId,
      `${String(surahNumber).padStart(3, "0")}.json`,
    );

    try {
      const file = await readFile(filePath, "utf8");
      return (JSON.parse(file) as TranslationSurahFile).entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }

      throw error;
    }
  })();

  sourceSurahCache.set(cacheKey, readPromise);
  return readPromise;
}

export async function getTranslationsForSurah(
  surahNumber: number,
): Promise<TranslationEntry[]> {
  const sources = await getSources();
  const entries = await Promise.all(
    sources.map((source) => readSourceSurah(source.id, surahNumber)),
  );

  return entries.flat();
}

export async function getTranslationsForVerse(
  verseKey: string,
): Promise<TranslationEntry[]> {
  const [surahPart, ayahPart] = verseKey.split(":");
  const surahNumber = Number(surahPart);
  const ayahNumber = Number(ayahPart);

  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
    return [];
  }

  const entries = await getTranslationsForSurah(surahNumber);
  return entries.filter((entry) => entry.ayahNumber === ayahNumber);
}
