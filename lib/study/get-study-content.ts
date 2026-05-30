import { readFile } from "node:fs/promises";
import path from "node:path";
import { type StudyContentEntry, type StudyContentKind, type StudyContentSurahFile } from "./types";

const generatedRoot = path.join(process.cwd(), "lib", "study", "generated");
const sourceSurahCache = new Map<string, Promise<StudyContentEntry[]>>();

const sourceConfigs: Record<
  StudyContentKind,
  Array<{
    dir: string;
    id: string;
    source: string;
  }>
> = {
  meaning: [
    {
      id: "quran-database-arabic-meanings",
      source: "Quran-Database - Arabic Meanings",
      dir: path.join(generatedRoot, "meanings", "quran-database-arabic-meanings", "by-surah"),
    },
  ],
  tafsir: [
    {
      id: "qf-tafsir-169-ibn-kathir-abridged",
      source: "Ibn Kathir",
      dir: path.join(generatedRoot, "tafsirs", "qf-tafsir-169-ibn-kathir-abridged", "by-surah"),
    },
    {
      id: "quran-database-saadi",
      source: "Quran-Database - Tafsir As-Saadi",
      dir: path.join(generatedRoot, "tafsirs", "quran-database-saadi", "by-surah"),
    },
    {
      id: "quran-database-muyassar",
      source: "Quran-Database - Tafsir Al-Muyassar",
      dir: path.join(generatedRoot, "tafsirs", "quran-database-muyassar", "by-surah"),
    },
    {
      id: "quran-database-baghawi",
      source: "Quran-Database - Tafsir Al-Baghawi",
      dir: path.join(generatedRoot, "tafsirs", "quran-database-baghawi", "by-surah"),
    },
  ],
  translation: [],
};

async function readSourceSurah(
  sourceConfig: (typeof sourceConfigs)[StudyContentKind][number],
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
      return (JSON.parse(file) as StudyContentSurahFile).entries.map((entry) => ({
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

export async function getStudyContentForSurah(
  kind: StudyContentKind,
  surahNumber: number,
): Promise<StudyContentEntry[]> {
  const entriesBySource = await Promise.all(
    sourceConfigs[kind].map((sourceConfig) => readSourceSurah(sourceConfig, surahNumber)),
  );

  return entriesBySource.flat();
}
