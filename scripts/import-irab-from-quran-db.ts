import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type ImportedRow = {
  surahNumber: number;
  ayahNumber: number;
  text: string;
};

type ImportResult = {
  selectedTable: string;
  columns: string[];
  rows: ImportedRow[];
  emptyCount: number;
  tables: Array<{ name: string; columns: string[] }>;
};

const sourceDbPath = path.join(
  process.cwd(),
  "data-sources",
  "quran-database",
  "quran.db",
);
const outputRoot = path.join(process.cwd(), "lib", "irab", "generated");
const outputBySurah = path.join(outputRoot, "by-surah");

const pythonScript = String.raw`
import json
import sqlite3
import sys

try:
  sys.stdout.reconfigure(encoding="utf-8")
except Exception:
  pass

db_path = sys.argv[1]
connection = sqlite3.connect(db_path)
connection.row_factory = sqlite3.Row
cursor = connection.cursor()

tables = [
  row["name"]
  for row in cursor.execute(
    "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
  )
]

def columns_for(table_name):
  return [row["name"] for row in cursor.execute(f'pragma table_info("{table_name}")')]

def normalized(value):
  return value.lower().replace("_", "").replace("-", "")

surah_names = {"sura", "surah", "sorah", "sora", "chapter", "chapterid", "suraid", "sorahid", "soraid", "surahid"}
ayah_names = {"aya", "ayah", "verse", "verseid", "ayahid", "ayaid"}
irab_tokens = ("earab", "eirab", "irab", "i3rab", "erab", "arabicgrammar")

table_infos = []
selected = None

for table in tables:
  cols = columns_for(table)
  lowered = [(col, normalized(col)) for col in cols]
  surah_col = next((col for col, key in lowered if key in surah_names or ("sura" in key and "name" not in key)), None)
  ayah_col = next((col for col, key in lowered if key in ayah_names or ("aya" in key and "name" not in key) or ("verse" in key and "text" not in key)), None)
  irab_col = next((col for col, key in lowered if any(token in key for token in irab_tokens)), None)

  table_infos.append({"name": table, "columns": cols})

  if surah_col and ayah_col and irab_col:
    selected = (table, cols, surah_col, ayah_col, irab_col)
    break

if selected is None:
  for table in tables:
    cols = columns_for(table)
    lowered = [(col, normalized(col)) for col in cols]
    surah_col = next((col for col, key in lowered if key in surah_names or "sura" in key), None)
    ayah_col = next((col for col, key in lowered if key in ayah_names or "aya" in key or "verse" in key), None)
    text_candidates = [
      col for col, key in lowered
      if "text" in key or "arabic" in key or "content" in key or any(token in key for token in irab_tokens)
    ]

    for text_col in text_candidates:
      if surah_col and ayah_col and text_col not in (surah_col, ayah_col):
        sample = cursor.execute(
          f'select "{text_col}" as text_value from "{table}" where "{text_col}" is not null limit 1'
        ).fetchone()
        if sample and str(sample["text_value"]).strip():
          selected = (table, cols, surah_col, ayah_col, text_col)
          break
    if selected is not None:
      break

if selected is None:
  print(json.dumps({"tables": table_infos, "error": "No likely i'rab table was found."}, ensure_ascii=False))
  sys.exit(2)

table, cols, surah_col, ayah_col, irab_col = selected
query = f'select "{surah_col}" as surah_number, "{ayah_col}" as ayah_number, "{irab_col}" as irab_text from "{table}" order by cast("{surah_col}" as integer), cast("{ayah_col}" as integer)'
rows = []
empty_count = 0

for row in cursor.execute(query):
  try:
    surah_number = int(row["surah_number"])
    ayah_number = int(row["ayah_number"])
  except Exception:
    empty_count += 1
    continue

  text = "" if row["irab_text"] is None else str(row["irab_text"]).strip()

  if not text:
    empty_count += 1
    continue

  rows.append({
    "surahNumber": surah_number,
    "ayahNumber": ayah_number,
    "text": text
  })

print(json.dumps({
  "selectedTable": table,
  "columns": cols,
  "rows": rows,
  "emptyCount": empty_count,
  "tables": table_infos
}, ensure_ascii=False))
`;

function runPythonImport() {
  const candidates = [
    { command: "python", args: ["-c", pythonScript, sourceDbPath] },
    { command: "python3", args: ["-c", pythonScript, sourceDbPath] },
    { command: "py", args: ["-3", "-c", pythonScript, sourceDbPath] },
  ];

  const errors: string[] = [];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 32,
    });

    if (result.error) {
      errors.push(`${candidate.command}: ${result.error.message}`);
      continue;
    }

    if (result.status === 0) {
      return JSON.parse(result.stdout) as ImportResult;
    }

    errors.push(
      `${candidate.command}: ${result.stderr.trim() || result.stdout.trim() || "failed"}`,
    );
  }

  throw new Error(
    `Unable to read quran.db. Make sure Python 3 is installed and sqlite3 is available.\n${errors.join("\n")}`,
  );
}

function cleanText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

async function main() {
  if (!existsSync(sourceDbPath)) {
    throw new Error(
      `Missing source database at ${sourceDbPath}. Download Abdallah-Mekky/Quran-Database quran.db and place it there first.`,
    );
  }

  const imported = runPythonImport();
  const bySurah = new Map<number, ImportedRow[]>();

  for (const row of imported.rows) {
    const cleaned = cleanText(row.text);

    if (!cleaned) {
      continue;
    }

    const currentRows = bySurah.get(row.surahNumber) ?? [];
    currentRows.push({ ...row, text: cleaned });
    bySurah.set(row.surahNumber, currentRows);
  }

  await rm(outputRoot, { force: true, recursive: true });
  await mkdir(outputBySurah, { recursive: true });

  const index = {
    source: "Quran-Database",
    selectedTable: imported.selectedTable,
    columns: imported.columns,
    importedAt: new Date().toISOString(),
    entryCount: imported.rows.length,
    emptyCount: imported.emptyCount,
    surahs: Array.from(bySurah.entries()).map(([surahNumber, entries]) => ({
      surahNumber,
      entryCount: entries.length,
      file: `by-surah/${String(surahNumber).padStart(3, "0")}.json`,
    })),
  };

  for (const [surahNumber, rows] of bySurah.entries()) {
    const entries = rows
      .sort((a, b) => a.ayahNumber - b.ayahNumber)
      .map((row) => ({
        verseKey: `${row.surahNumber}:${row.ayahNumber}`,
        surahNumber: row.surahNumber,
        ayahNumber: row.ayahNumber,
        text: row.text,
        source: "Quran-Database",
      }));

    await writeFile(
      path.join(outputBySurah, `${String(surahNumber).padStart(3, "0")}.json`),
      `${JSON.stringify({ source: "Quran-Database", surahNumber, entries }, null, 2)}\n`,
      "utf8",
    );
  }

  await writeFile(
    path.join(outputRoot, "irab-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  const examples = ["1:1", "1:2", "2:255", "3:7", "18:1"].map((verseKey) => {
    const [surahNumber, ayahNumber] = verseKey.split(":").map(Number);
    const text =
      bySurah
        .get(surahNumber)
        ?.find((row) => row.ayahNumber === ayahNumber)
        ?.text.slice(0, 160) ?? null;

    return { verseKey, present: Boolean(text), preview: text };
  });

  console.log(`Imported ${imported.rows.length} i'rab entries from ${imported.selectedTable}.`);
  console.log(`Skipped ${imported.emptyCount} empty or invalid entries.`);
  console.log(`Generated ${bySurah.size} surah files in ${outputBySurah}.`);
  console.log(JSON.stringify({ examples }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
