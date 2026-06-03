import fs from "node:fs";
import path from "node:path";
import { type NormalizedHadith, type ParsedHadithReference } from "../types";
import { type HadithLookupProvider } from "./types";

const PROVIDER_ID = "hadithapi";
const BASE_URL = "https://hadithapi.com/public/api";

type UnknownRecord = Record<string, unknown>;

function stripEnvQuotes(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readLocalEnv(name: string) {
  try {
    const envPath = path.join(process.cwd(), ".env.local");
    const content = fs.readFileSync(envPath, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((entry) => entry.trimStart().startsWith(`${name}=`));

    if (!line) return undefined;

    const separatorIndex = line.indexOf("=");

    return stripEnvQuotes(separatorIndex >= 0 ? line.slice(separatorIndex + 1) : "");
  } catch {
    return undefined;
  }
}

function getServerEnv(name: string) {
  const value = process.env[name];
  const cleanedValue = value ? stripEnvQuotes(value) : "";

  return cleanedValue || readLocalEnv(name);
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function stringField(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return undefined;
}

function nestedString(record: UnknownRecord, key: string, nestedKeys: string[]) {
  return stringField(asRecord(record[key]), nestedKeys);
}

function pickHadith(payload: UnknownRecord) {
  const hadiths = payload.hadiths;
  const data = asRecord(payload.data);
  const hadithsRecord = asRecord(hadiths);
  const candidates = [
    Array.isArray(hadiths) ? hadiths[0] : undefined,
    Array.isArray(hadithsRecord.data) ? hadithsRecord.data[0] : undefined,
    hadithsRecord.data,
    payload.hadith,
    Array.isArray(payload.data) ? payload.data[0] : undefined,
    data,
  ];

  return asRecord(candidates.find((candidate) => candidate && typeof candidate === "object"));
}

export function createHadithApiProvider(): HadithLookupProvider {
  return {
    id: PROVIDER_ID,
    async lookup(reference: ParsedHadithReference): Promise<NormalizedHadith> {
      const apiKey = getServerEnv("HADITH_API_KEY");
      const book = reference.providerCollectionSlug;

      if (!apiKey) {
        throw new Error("HADITH_API_KEY is not configured.");
      }

      if (!book) {
        throw new Error(`${reference.collection} is not supported by HadithAPI yet.`);
      }

      const url = new URL(`${BASE_URL}/hadiths`);
      url.searchParams.set("apiKey", apiKey);
      url.searchParams.set("book", book);
      url.searchParams.set("hadithNumber", reference.hadithNumber);

      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Hadith provider returned ${response.status}.`);
      }

      const payload = asRecord(await response.json());
      const hadith = pickHadith(payload);
      const arabicText = stringField(hadith, [
        "hadithArabic",
        "hadithArabicText",
        "arabicText",
        "arabic",
      ]);
      const englishText = stringField(hadith, [
        "hadithEnglish",
        "hadithEnglishText",
        "englishText",
        "english",
        "hadith",
      ]);
      const hadithNumber =
        stringField(hadith, ["hadithNumber", "hadithNo", "hadith_number"]) ??
        reference.hadithNumber;

      if (!arabicText && !englishText) {
        throw new Error("No hadith text was found for that reference.");
      }

      return {
        arabicText,
        book: nestedString(hadith, "book", ["bookName", "bookNameEnglish", "name"]) ??
          stringField(hadith, ["book", "bookName"]),
        chapter:
          nestedString(hadith, "chapter", ["chapterEnglish", "chapterArabic", "name"]) ??
          stringField(hadith, ["chapter", "chapterEnglish"]),
        collection: reference.collection,
        collectionSlug: reference.collectionSlug,
        englishText,
        grade: stringField(hadith, ["status", "grade"]),
        hadithNumber,
        narrator: stringField(hadith, ["englishNarrator", "narrator", "rawi"]),
        provider: "HadithAPI",
        providerHadithId: stringField(hadith, ["id", "hadithId", "hadith_id"]),
        reference: `${reference.collection} ${hadithNumber}`,
        sourceUrl: `https://hadithapi.com`,
      };
    },
  };
}
