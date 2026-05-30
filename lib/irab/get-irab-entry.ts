import { readFile } from "node:fs/promises";
import path from "node:path";
import { type IrabEntry, type IrabSource, type IrabSourceId, type IrabSurahFile } from "./types";

const generatedRoot = path.join(process.cwd(), "lib", "irab", "generated");
const sourceSurahCache = new Map<string, Promise<IrabEntry[]>>();

const sourceConfigs: Array<{
  id: IrabSourceId;
  source: IrabSource;
  dir: string;
}> = [
  {
    id: "furqan-karbasi",
    source: "Furqan - Al-Karbasi",
    dir: path.join(generatedRoot, "sources", "furqan-karbasi", "by-surah"),
  },
  {
    id: "furqan-muyassar",
    source: "Furqan - Muyassar",
    dir: path.join(generatedRoot, "sources", "furqan-muyassar", "by-surah"),
  },
];

function parseVerseKey(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);

  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) {
    return null;
  }

  return { surahNumber: surah, ayahNumber: ayah };
}

async function readSourceSurah(
  sourceConfig: (typeof sourceConfigs)[number],
  surahNumber: number,
) {
  const cacheKey = `${sourceConfig.id}:${surahNumber}`;

  if (sourceSurahCache.has(cacheKey)) {
    return sourceSurahCache.get(cacheKey) ?? Promise.resolve([]);
  }

  const readPromise = (async () => {
    const filePath = path.join(
      sourceConfig.dir,
      `${String(surahNumber).padStart(3, "0")}.json`,
    );

    try {
      const file = await readFile(filePath, "utf8");
      return (JSON.parse(file) as IrabSurahFile).entries.map((entry) => ({
        ...entry,
        source: entry.source ?? sourceConfig.source,
        sourceId: entry.sourceId ?? sourceConfig.id,
      }));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;

      if (code === "ENOENT") {
        return [];
      }

      throw error;
    }
  })();

  sourceSurahCache.set(cacheKey, readPromise);
  return readPromise;
}

export async function getIrabForSurah(surahNumber: number) {
  const entriesBySource = await Promise.all(
    sourceConfigs.map((sourceConfig) => readSourceSurah(sourceConfig, surahNumber)),
  );

  return entriesBySource.flat();
}

export async function getIrabEntries(verseKey: string): Promise<IrabEntry[]> {
  const parsed = parseVerseKey(verseKey);

  if (!parsed) {
    return [];
  }

  const entries = await getIrabForSurah(parsed.surahNumber);

  return entries.filter((entry) => entry.ayahNumber === parsed.ayahNumber);
}

export async function getIrabEntry(verseKey: string): Promise<IrabEntry | null> {
  const entries = await getIrabEntries(verseKey);

  return entries[0] ?? null;
}
