import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type SourceId = "furqan-karbasi" | "furqan-muyassar";

type RawEntry = {
  sourceId: SourceId;
  source: "Furqan - Al-Karbasi" | "Furqan - Muyassar";
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
};

const sourceRoot = path.join(process.cwd(), "data-sources", "furqan");
const outputRoot = path.join(process.cwd(), "lib", "irab", "generated", "sources");

const sourceLabels: Record<SourceId, RawEntry["source"]> = {
  "furqan-karbasi": "Furqan - Al-Karbasi",
  "furqan-muyassar": "Furqan - Muyassar",
};

const sqliteExtensions = new Set([".db", ".sqlite", ".sqlite3"]);
const jsonExtensions = new Set([".json"]);

function detectSourceId(value: string): SourceId | null {
  const normalized = value.toLowerCase();

  if (normalized.includes("karbasi") || normalized.includes("karbas")) {
    return "furqan-karbasi";
  }

  if (
    normalized.includes("muyassar") ||
    normalized.includes("moyassar") ||
    normalized.includes("muyaser") ||
    normalized.includes("moyaser")
  ) {
    return "furqan-muyassar";
  }

  return null;
}

function walkFiles(dir: string): string[] {
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

    return [fullPath];
  });
}

const sqlitePython = String.raw`
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

def norm(value):
  return value.lower().replace("_", "").replace("-", "")

def detect_source(value):
  lowered = value.lower()
  if "karbasi" in lowered or "karbas" in lowered:
    return "furqan-karbasi"
  if "muyassar" in lowered or "moyassar" in lowered or "muyaser" in lowered or "moyaser" in lowered:
    return "furqan-muyassar"
  return None

surah_keys = {"sura", "surah", "sorah", "sora", "chapter", "chapterid", "suraid", "surahid"}
ayah_keys = {"aya", "ayah", "verse", "verseid", "ayahid", "ayaid"}
text_tokens = ("irab", "i3rab", "e3rab", "eirab", "earab", "arabicgrammar")

tables = [
  row["name"]
  for row in list(cursor.execute(
    "select name from sqlite_master where type='table' and name not like 'sqlite_%' order by name"
  ))
]

entries = []

if "ayah_mapping" in tables and "irab_content" in tables:
  import re
  try:
    import json as json_module
  except Exception:
    json_module = None

  source_id = detect_source(db_path)
  if source_id is not None:
    content_rows = {
      int(row["content_id"]): row
      for row in cursor.execute('select content_id, word, explanation from irab_content')
    }

    for row in cursor.execute('select surah_number, ayah_number, content_ids from ayah_mapping order by surah_number, ayah_number'):
      try:
        surah_number = int(row["surah_number"])
        ayah_number = int(row["ayah_number"])
      except Exception:
        continue

      raw_ids = "" if row["content_ids"] is None else str(row["content_ids"])
      content_ids = []
      if json_module is not None:
        try:
          content_ids = [int(value) for value in json_module.loads(raw_ids)]
        except Exception:
          content_ids = []
      if not content_ids:
        content_ids = [int(value) for value in re.findall(r"\d+", raw_ids)]

      parts = []
      for content_id in content_ids:
        content = content_rows.get(content_id)
        if content is None:
          continue

        word = "" if content["word"] is None else str(content["word"]).strip()
        explanation = "" if content["explanation"] is None else str(content["explanation"]).strip()
        if not word and not explanation:
          continue

        if word and explanation:
          parts.append(f"«{word}» {explanation}")
        elif explanation:
          parts.append(explanation)
        else:
          parts.append(f"«{word}»")

      text = "\n\n".join(parts).strip()
      if text:
        entries.append({
          "sourceId": source_id,
          "surahNumber": surah_number,
          "ayahNumber": ayah_number,
          "text": text
        })

for table in tables:
  columns = [row["name"] for row in cursor.execute(f'pragma table_info("{table}")')]
  lowered = [(column, norm(column)) for column in columns]
  surah_col = next((column for column, key in lowered if key in surah_keys or ("sura" in key and "name" not in key)), None)
  ayah_col = next((column for column, key in lowered if key in ayah_keys or ("aya" in key and "name" not in key) or ("verse" in key and "text" not in key)), None)
  text_cols = [column for column, key in lowered if any(token in key for token in text_tokens)]

  if not surah_col or not ayah_col or not text_cols:
    continue

  for text_col in text_cols:
    source_id = detect_source(table + " " + text_col + " " + db_path)
    if source_id is None:
      continue

    query = f'select "{surah_col}" as surah_number, "{ayah_col}" as ayah_number, "{text_col}" as text_value from "{table}" order by cast("{surah_col}" as integer), cast("{ayah_col}" as integer)'
    for row in cursor.execute(query):
      try:
        surah_number = int(row["surah_number"])
        ayah_number = int(row["ayah_number"])
      except Exception:
        continue

      text = "" if row["text_value"] is None else str(row["text_value"]).strip()
      if not text:
        continue

      entries.append({
        "sourceId": source_id,
        "surahNumber": surah_number,
        "ayahNumber": ayah_number,
        "text": text
      })

print(json.dumps({"entries": entries}, ensure_ascii=False))
`;

function readSqliteEntries(filePath: string): RawEntry[] {
  const result = spawnSync("python", ["-c", sqlitePython, filePath], {
    encoding: "utf8",
    env: {
      ...process.env,
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
    maxBuffer: 1024 * 1024 * 64,
  });

  if (result.error || result.status !== 0) {
    return [];
  }

  const payload = JSON.parse(result.stdout) as {
    entries: Array<Omit<RawEntry, "source" | "verseKey">>;
  };

  return payload.entries.map((entry) => ({
    ...entry,
    verseKey: `${entry.surahNumber}:${entry.ayahNumber}`,
    source: sourceLabels[entry.sourceId],
  }));
}

function getObjectNumber(record: Record<string, unknown>, tokens: string[]) {
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

function readJsonEntries(filePath: string): RawEntry[] {
  const sourceIdFromPath = detectSourceId(filePath);
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const entries: RawEntry[] = [];

  function visit(value: unknown, context = "") {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${context}.${index}`));
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const surahNumber = getObjectNumber(record, ["surah", "sura", "sorah", "sora", "chapter"]);
    const ayahNumber = getObjectNumber(record, ["ayah", "aya", "verse"]);

    for (const [key, maybeText] of Object.entries(record)) {
      if (typeof maybeText !== "string" || !maybeText.trim()) {
        continue;
      }

      const normalized = key.toLowerCase().replace(/[_-]/g, "");
      const looksIrab =
        normalized.includes("irab") ||
        normalized.includes("i3rab") ||
        normalized.includes("e3rab") ||
        normalized.includes("eirab") ||
        normalized.includes("earab") ||
        normalized.includes("arabicgrammar");
      const sourceId = detectSourceId(`${filePath} ${context} ${key}`) ?? sourceIdFromPath;

      if (!looksIrab || !sourceId || !surahNumber || !ayahNumber) {
        continue;
      }

      entries.push({
        verseKey: `${surahNumber}:${ayahNumber}`,
        surahNumber,
        ayahNumber,
        text: maybeText.trim(),
        source: sourceLabels[sourceId],
        sourceId,
      });
    }

    Object.entries(record).forEach(([key, item]) => visit(item, `${context}.${key}`));
  }

  visit(parsed, path.basename(filePath));

  return entries;
}

function writeSource(sourceId: SourceId, entries: RawEntry[]) {
  const sourceDir = path.join(outputRoot, sourceId);
  const bySurahDir = path.join(sourceDir, "by-surah");
  const bySurah = new Map<number, RawEntry[]>();

  rmSync(sourceDir, { force: true, recursive: true });
  mkdirSync(bySurahDir, { recursive: true });

  for (const entry of entries) {
    const current = bySurah.get(entry.surahNumber) ?? [];
    current.push(entry);
    bySurah.set(entry.surahNumber, current);
  }

  for (const [surahNumber, surahEntries] of bySurah.entries()) {
    const deduped = Array.from(
      new Map(surahEntries.map((entry) => [entry.verseKey, entry])).values(),
    ).sort((a, b) => a.ayahNumber - b.ayahNumber);

    writeFileSync(
      path.join(bySurahDir, `${String(surahNumber).padStart(3, "0")}.json`),
      `${JSON.stringify(
        {
          source: sourceLabels[sourceId],
          sourceId,
          surahNumber,
          entries: deduped,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  writeFileSync(
    path.join(sourceDir, "index.json"),
    `${JSON.stringify(
      {
        source: sourceLabels[sourceId],
        sourceId,
        importedAt: new Date().toISOString(),
        entryCount: entries.length,
        surahs: Array.from(bySurah.entries()).map(([surahNumber, surahEntries]) => ({
          surahNumber,
          entryCount: new Set(surahEntries.map((entry) => entry.verseKey)).size,
          file: `by-surah/${String(surahNumber).padStart(3, "0")}.json`,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function main() {
  const files = walkFiles(sourceRoot);

  if (files.length === 0) {
    throw new Error(
      `No Furqan files found under ${sourceRoot}. Clone or copy app-furqan/quran-app-data there first.`,
    );
  }

  const allEntries = files.flatMap((filePath) => {
    const extension = path.extname(filePath).toLowerCase();

    if (sqliteExtensions.has(extension)) {
      return readSqliteEntries(filePath);
    }

    if (jsonExtensions.has(extension)) {
      try {
        return readJsonEntries(filePath);
      } catch {
        return [];
      }
    }

    return [];
  });

  const grouped = {
    "furqan-karbasi": allEntries.filter((entry) => entry.sourceId === "furqan-karbasi"),
    "furqan-muyassar": allEntries.filter((entry) => entry.sourceId === "furqan-muyassar"),
  } satisfies Record<SourceId, RawEntry[]>;

  if (allEntries.length === 0) {
    throw new Error("No Furqan i'rab entries were detected. Run npm run inspect:furqan.");
  }

  mkdirSync(outputRoot, { recursive: true });

  for (const [sourceId, entries] of Object.entries(grouped) as Array<[SourceId, RawEntry[]]>) {
    if (entries.length > 0) {
      writeSource(sourceId, entries);
    }
  }

  console.log("Furqan i'rab import complete.");
  console.log(`Al-Karbasi entries: ${grouped["furqan-karbasi"].length}`);
  console.log(`Muyassar entries: ${grouped["furqan-muyassar"].length}`);
}

main();
