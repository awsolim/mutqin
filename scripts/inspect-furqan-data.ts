import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = path.join(process.cwd(), "data-sources", "furqan");
const sqliteExtensions = new Set([".db", ".sqlite", ".sqlite3"]);
const jsonExtensions = new Set([".json"]);
const sampleVerseKeys = new Set(["1:1", "1:2", "2:255", "3:7", "18:1"]);

type DiscoveredFile = {
  path: string;
  extension: string;
};

type SqliteInspection = {
  tables: Array<{
    name: string;
    columns: string[];
    likelyIrabColumns: string[];
    sampleEntries: Array<{
      verseKey: string;
      column: string;
      preview: string;
    }>;
  }>;
};

function walkFiles(dir: string): DiscoveredFile[] {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") {
        return [];
      }

      return walkFiles(fullPath);
    }

    return [{ path: fullPath, extension: path.extname(entry.name).toLowerCase() }];
  });
}

const sqliteInspectPython = String.raw`
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

samples = {"1:1", "1:2", "2:255", "3:7", "18:1"}

def norm(value):
  return value.lower().replace("_", "").replace("-", "")

surah_keys = {"sura", "surah", "sorah", "sora", "chapter", "chapterid", "suraid", "surahid"}
ayah_keys = {"aya", "ayah", "verse", "verseid", "ayahid", "ayaid"}
text_tokens = ("irab", "i3rab", "e3rab", "eirab", "earab", "arabicgrammar")

tables = []
table_rows = list(cursor.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"))

for table_row in table_rows:
  table = table_row["name"]
  columns = [row["name"] for row in cursor.execute(f'pragma table_info("{table}")')]
  lowered = [(column, norm(column)) for column in columns]
  likely = [column for column, key in lowered if any(token in key for token in text_tokens)]
  surah_col = next((column for column, key in lowered if key in surah_keys or ("sura" in key and "name" not in key)), None)
  ayah_col = next((column for column, key in lowered if key in ayah_keys or ("aya" in key and "name" not in key) or ("verse" in key and "text" not in key)), None)
  sample_entries = []

  if surah_col and ayah_col:
    for text_col in likely:
      query = f'select "{surah_col}" as surah_number, "{ayah_col}" as ayah_number, "{text_col}" as text_value from "{table}" where "{text_col}" is not null limit 20000'
      for row in cursor.execute(query):
        try:
          verse_key = f'{int(row["surah_number"])}:{int(row["ayah_number"])}'
        except Exception:
          continue
        text = "" if row["text_value"] is None else str(row["text_value"]).strip()
        if verse_key in samples and text:
          sample_entries.append({
            "verseKey": verse_key,
            "column": text_col,
            "preview": text[:180]
          })

  tables.append({
    "name": table,
    "columns": columns,
    "likelyIrabColumns": likely,
    "sampleEntries": sample_entries
  })

if "ayah_mapping" in [table["name"] for table in tables] and "irab_content" in [table["name"] for table in tables]:
  import json as json_module
  import re
  content_rows = {
    int(row["content_id"]): row
    for row in cursor.execute('select content_id, word, explanation from irab_content')
  }
  sample_entries = []
  for row in cursor.execute('select surah_number, ayah_number, content_ids from ayah_mapping'):
    try:
      verse_key = f'{int(row["surah_number"])}:{int(row["ayah_number"])}'
    except Exception:
      continue
    if verse_key not in samples:
      continue
    raw_ids = "" if row["content_ids"] is None else str(row["content_ids"])
    try:
      content_ids = [int(value) for value in json_module.loads(raw_ids)]
    except Exception:
      content_ids = [int(value) for value in re.findall(r"\d+", raw_ids)]
    parts = []
    for content_id in content_ids[:4]:
      content = content_rows.get(content_id)
      if content is None:
        continue
      word = "" if content["word"] is None else str(content["word"]).strip()
      explanation = "" if content["explanation"] is None else str(content["explanation"]).strip()
      parts.append(f"«{word}» {explanation}".strip())
    if parts:
      sample_entries.append({
        "verseKey": verse_key,
        "column": "ayah_mapping.content_ids -> irab_content.explanation",
        "preview": "\\n".join(parts)[:180]
      })
  tables.append({
    "name": "Furqan normalized i'rab",
    "columns": ["ayah_mapping.content_ids", "irab_content.word", "irab_content.explanation"],
    "likelyIrabColumns": ["irab_content.explanation"],
    "sampleEntries": sample_entries
  })

print(json.dumps({"tables": tables}, ensure_ascii=False))
`;

function inspectSqlite(filePath: string): SqliteInspection | null {
  const result = spawnSync("python", ["-c", sqliteInspectPython, filePath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
    maxBuffer: 1024 * 1024 * 32,
  });

  if (result.error || result.status !== 0) {
    return null;
  }

  return JSON.parse(result.stdout) as SqliteInspection;
}

function inspectJson(filePath: string) {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const samples: Array<{ verseKey: string; key: string; preview: string }> = [];
  const irabKeys = new Set<string>();

  function visit(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const surahNumber = getNumber(record, ["surah", "sura", "sora", "chapter"]);
    const ayahNumber = getNumber(record, ["ayah", "aya", "verse"]);

    for (const [key, item] of Object.entries(record)) {
      const normalized = key.toLowerCase().replace(/[_-]/g, "");
      const looksIrab =
        normalized.includes("irab") ||
        normalized.includes("i3rab") ||
        normalized.includes("e3rab") ||
        normalized.includes("eirab") ||
        normalized.includes("earab") ||
        normalized.includes("arabicgrammar");

      if (looksIrab) {
        irabKeys.add(key);
      }

      if (
        looksIrab &&
        typeof item === "string" &&
        surahNumber &&
        ayahNumber &&
        sampleVerseKeys.has(`${surahNumber}:${ayahNumber}`)
      ) {
        samples.push({
          verseKey: `${surahNumber}:${ayahNumber}`,
          key,
          preview: item.slice(0, 180),
        });
      }

      visit(item);
    }
  }

  visit(parsed);

  return { likelyIrabKeys: Array.from(irabKeys), sampleEntries: samples };
}

function getNumber(record: Record<string, unknown>, tokens: string[]) {
  for (const [key, value] of Object.entries(record)) {
    const normalized = key.toLowerCase().replace(/[_-]/g, "");

    if (tokens.some((token) => normalized.includes(token))) {
      const numberValue = Number(value);

      if (Number.isInteger(numberValue)) {
        return numberValue;
      }
    }
  }

  return null;
}

function main() {
  const files = walkFiles(sourceRoot);
  const relevantFiles = files.filter(
    (file) => sqliteExtensions.has(file.extension) || jsonExtensions.has(file.extension),
  );

  console.log(`Furqan source root: ${sourceRoot}`);
  console.log(`Discovered database/json files: ${relevantFiles.length}`);

  for (const file of relevantFiles) {
    const relativePath = path.relative(sourceRoot, file.path);
    console.log(`\n${relativePath}`);

    if (sqliteExtensions.has(file.extension)) {
      const inspection = inspectSqlite(file.path);

      if (!inspection) {
        console.log("  SQLite inspection failed.");
        continue;
      }

      for (const table of inspection.tables) {
        const likely = table.likelyIrabColumns.join(", ") || "none";
        console.log(`  table: ${table.name}`);
        console.log(`    columns: ${table.columns.join(", ")}`);
        console.log(`    likely i'rab columns: ${likely}`);
        for (const sample of table.sampleEntries) {
          console.log(`    sample ${sample.verseKey} (${sample.column}): ${sample.preview}`);
        }
      }
      continue;
    }

    try {
      const inspection = inspectJson(file.path);
      console.log(`  likely i'rab keys: ${inspection.likelyIrabKeys.join(", ") || "none"}`);
      for (const sample of inspection.sampleEntries) {
        console.log(`  sample ${sample.verseKey} (${sample.key}): ${sample.preview}`);
      }
    } catch (error) {
      console.log(`  JSON inspection failed: ${(error as Error).message}`);
    }
  }
}

main();
