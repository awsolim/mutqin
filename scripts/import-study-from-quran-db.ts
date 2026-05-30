import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

type SourceConfig = {
  column: string;
  direction: "rtl";
  kind: "meaning" | "tafsir";
  language: "ar";
  outputDir: string;
  source: string;
  sourceId: string;
};

type SourceRow = {
  ayahNumber: number;
  sourceId: string;
  surahNumber: number;
  text: string;
};

type ImportResult = {
  rows: SourceRow[];
  skipped: Record<string, number>;
};

const sourceDbPath = path.join(
  process.cwd(),
  "data-sources",
  "quran-database",
  "quran.db",
);
const generatedRoot = path.join(process.cwd(), "lib", "study", "generated");

const sources: SourceConfig[] = [
  {
    kind: "meaning",
    sourceId: "quran-database-arabic-meanings",
    source: "Quran-Database - Arabic Meanings",
    column: "maany_aya",
    language: "ar",
    direction: "rtl",
    outputDir: path.join(generatedRoot, "meanings", "quran-database-arabic-meanings"),
  },
  {
    kind: "tafsir",
    sourceId: "quran-database-saadi",
    source: "Quran-Database - Tafsir As-Saadi",
    column: "tafseer_saadi",
    language: "ar",
    direction: "rtl",
    outputDir: path.join(generatedRoot, "tafsirs", "quran-database-saadi"),
  },
  {
    kind: "tafsir",
    sourceId: "quran-database-muyassar",
    source: "Quran-Database - Tafsir Al-Muyassar",
    column: "tafseer_moysar",
    language: "ar",
    direction: "rtl",
    outputDir: path.join(generatedRoot, "tafsirs", "quran-database-muyassar"),
  },
  {
    kind: "tafsir",
    sourceId: "quran-database-baghawi",
    source: "Quran-Database - Tafsir Al-Baghawi",
    column: "tafseer_bughiu",
    language: "ar",
    direction: "rtl",
    outputDir: path.join(generatedRoot, "tafsirs", "quran-database-baghawi"),
  },
];

const pythonScript = String.raw`
import json
import sqlite3
import sys

try:
  sys.stdout.reconfigure(encoding="utf-8")
except Exception:
  pass

db_path = sys.argv[1]
source_configs = json.loads(sys.argv[2])
connection = sqlite3.connect(db_path)
connection.row_factory = sqlite3.Row
cursor = connection.cursor()

rows = []
skipped = {}

for config in source_configs:
  source_id = config["sourceId"]
  column = config["column"]
  skipped[source_id] = 0
  query = f'select sora as surah_number, aya_no as ayah_number, "{column}" as text_value from quran order by sora, aya_no'
  for row in cursor.execute(query):
    try:
      surah_number = int(row["surah_number"])
      ayah_number = int(row["ayah_number"])
    except Exception:
      skipped[source_id] += 1
      continue
    text = "" if row["text_value"] is None else str(row["text_value"]).strip()
    if not text:
      skipped[source_id] += 1
      continue
    rows.append({
      "sourceId": source_id,
      "surahNumber": surah_number,
      "ayahNumber": ayah_number,
      "text": text
    })

print(json.dumps({"rows": rows, "skipped": skipped}, ensure_ascii=False))
`;

function runPythonImport() {
  const result = spawnSync("python", ["-c", pythonScript, sourceDbPath, JSON.stringify(sources)], {
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
    maxBuffer: 1024 * 1024 * 128,
  });

  if (result.error || result.status !== 0) {
    throw new Error(result.stderr || result.error?.message || "Unable to import study data.");
  }

  return JSON.parse(result.stdout) as ImportResult;
}

async function writeSource(config: SourceConfig, rows: SourceRow[]) {
  const bySurahDir = path.join(config.outputDir, "by-surah");
  const bySurah = new Map<number, SourceRow[]>();

  await rm(config.outputDir, { force: true, recursive: true });
  await mkdir(bySurahDir, { recursive: true });

  for (const row of rows) {
    const currentRows = bySurah.get(row.surahNumber) ?? [];
    currentRows.push(row);
    bySurah.set(row.surahNumber, currentRows);
  }

  for (const [surahNumber, surahRows] of bySurah.entries()) {
    const entries = surahRows
      .sort((a, b) => a.ayahNumber - b.ayahNumber)
      .map((row) => ({
        verseKey: `${row.surahNumber}:${row.ayahNumber}`,
        surahNumber: row.surahNumber,
        ayahNumber: row.ayahNumber,
        text: row.text,
        kind: config.kind,
        source: config.source,
        sourceId: config.sourceId,
        language: config.language,
        direction: config.direction,
      }));

    await writeFile(
      path.join(bySurahDir, `${String(surahNumber).padStart(3, "0")}.json`),
      `${JSON.stringify(
        {
          kind: config.kind,
          source: config.source,
          sourceId: config.sourceId,
          language: config.language,
          direction: config.direction,
          surahNumber,
          entries,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  await writeFile(
    path.join(config.outputDir, "index.json"),
    `${JSON.stringify(
      {
        kind: config.kind,
        source: config.source,
        sourceId: config.sourceId,
        language: config.language,
        direction: config.direction,
        importedAt: new Date().toISOString(),
        entryCount: rows.length,
        surahs: Array.from(bySurah.entries()).map(([surahNumber, surahRows]) => ({
          surahNumber,
          entryCount: surahRows.length,
          file: `by-surah/${String(surahNumber).padStart(3, "0")}.json`,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function main() {
  if (!existsSync(sourceDbPath)) {
    throw new Error(`Missing source database at ${sourceDbPath}.`);
  }

  const result = runPythonImport();

  for (const source of sources) {
    const rows = result.rows.filter((row) => row.sourceId === source.sourceId);
    await writeSource(source, rows);
    console.log(`${source.source}: ${rows.length} entries, ${result.skipped[source.sourceId]} skipped.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
