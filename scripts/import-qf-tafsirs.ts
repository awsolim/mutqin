import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

type QfEnvironment = "production" | "prelive";

type TafsirResource = {
  id?: number;
  name?: string;
  author_name?: string;
  authorName?: string;
  slug?: string;
  language_name?: string;
  languageName?: string;
  language?: string;
  translated_name?: { name?: string };
  translatedName?: { name?: string };
  [key: string]: unknown;
};

type StudyEntry = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  kind: "tafsir";
  source: string;
  sourceId: string;
  language: "en";
  direction: "ltr";
};

const generatedRoot = path.join(process.cwd(), "lib", "study", "generated");
const DEFAULT_TAFSIR_ID = 169;

function loadDotEnv() {
  try {
    const content = fs.readFileSync(".env.local", "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local is optional in deployed/CI environments.
  }
}

function getEnvironmentConfig() {
  const env = (process.env.QF_ENV ?? "prelive") as QfEnvironment;

  if (env !== "production" && env !== "prelive") {
    throw new Error("QF_ENV must be either production or prelive.");
  }

  return env === "production"
    ? {
        authBaseUrl: "https://oauth2.quran.foundation",
        apiBaseUrl: "https://apis.quran.foundation/content/api/v4",
      }
    : {
        authBaseUrl: "https://prelive-oauth2.quran.foundation",
        apiBaseUrl: "https://apis-prelive.quran.foundation/content/api/v4",
      };
}

function requireCredentials() {
  const clientId = process.env.QF_CLIENT_ID;
  const clientSecret = process.env.QF_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing QF_CLIENT_ID or QF_CLIENT_SECRET. Add server-only Quran Foundation credentials to .env.local.",
    );
  }

  return { clientId, clientSecret };
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`QF request failed (${response.status}) for ${url}: ${body.slice(0, 300)}`);
  }

  return JSON.parse(body) as unknown;
}

async function getAccessToken(authBaseUrl: string, clientId: string, clientSecret: string) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = (await fetchJson(`${authBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
  })) as { access_token?: string };

  if (!data.access_token) {
    throw new Error("Quran Foundation token response did not include access_token.");
  }

  return data.access_token;
}

function authHeaders(accessToken: string, clientId: string) {
  return {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
  };
}

async function fetchTafsirs(apiBaseUrl: string, accessToken: string, clientId: string) {
  const data = (await fetchJson(`${apiBaseUrl}/resources/tafsirs`, {
    headers: authHeaders(accessToken, clientId),
  })) as { tafsirs?: TafsirResource[] } | TafsirResource[];

  return Array.isArray(data) ? data : data.tafsirs ?? [];
}

function getName(resource: TafsirResource) {
  return String(resource.name ?? resource.translated_name?.name ?? resource.translatedName?.name ?? "");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeHtml(text: string) {
  return text
    .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function parseVerseKey(value: unknown) {
  if (typeof value !== "string" || !/^\d+:\d+$/.test(value)) {
    return null;
  }

  const [surahNumber, ayahNumber] = value.split(":").map(Number);
  return { verseKey: value, surahNumber, ayahNumber };
}

function normalizeTafsirPayload(payload: unknown, resource: TafsirResource): StudyEntry[] {
  const sourceId = `qf-tafsir-${resource.id}-${slugify(getName(resource) || String(resource.id))}`;
  const source = resource.id === DEFAULT_TAFSIR_ID ? "Ibn Kathir" : getName(resource);
  const tafsirs = ((payload as { tafsirs?: unknown[] }).tafsirs ?? []) as Array<{
    text?: string;
    verse_key?: string;
    verseKey?: string;
  }>;

  return tafsirs
    .map((entry) => {
      const parsed = parseVerseKey(entry.verse_key ?? entry.verseKey);
      const text = normalizeHtml(entry.text ?? "");

      if (!parsed || !text) {
        return null;
      }

      return {
        ...parsed,
        text,
        kind: "tafsir" as const,
        source,
        sourceId,
        language: "en" as const,
        direction: "ltr" as const,
      };
    })
    .filter((entry): entry is StudyEntry => Boolean(entry));
}

async function fetchChapterTafsirs(
  apiBaseUrl: string,
  accessToken: string,
  clientId: string,
  resource: TafsirResource,
  surahNumber: number,
) {
  const headers = authHeaders(accessToken, clientId);
  const urls = [
    `${apiBaseUrl}/tafsirs/${resource.id}/by_chapter/${surahNumber}?per_page=300`,
    `${apiBaseUrl}/tafsirs/${resource.id}/by_chapter/${surahNumber}`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchJson(url, { headers });
      const entries = normalizeTafsirPayload(payload, resource);
      if (entries.length) {
        return entries;
      }
    } catch (error) {
      if (url === urls[urls.length - 1]) {
        throw error;
      }
    }
  }

  return [];
}

async function writeSource(resource: TafsirResource, chapters: StudyEntry[][]) {
  const sourceId = `qf-tafsir-${resource.id}-${slugify(getName(resource) || String(resource.id))}`;
  const source = resource.id === DEFAULT_TAFSIR_ID ? "Ibn Kathir" : getName(resource);
  const outputDir = path.join(generatedRoot, "tafsirs", sourceId);
  const bySurahDir = path.join(outputDir, "by-surah");

  await fsp.rm(outputDir, { force: true, recursive: true });
  await fsp.mkdir(bySurahDir, { recursive: true });

  await fsp.writeFile(
    path.join(outputDir, "index.json"),
    `${JSON.stringify(
      {
        kind: "tafsir",
        source,
        sourceId,
        language: "en",
        direction: "ltr",
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const entries = chapters[surahNumber] ?? [];
    await fsp.writeFile(
      path.join(bySurahDir, `${String(surahNumber).padStart(3, "0")}.json`),
      `${JSON.stringify(
        {
          kind: "tafsir",
          source,
          sourceId,
          language: "en",
          direction: "ltr",
          surahNumber,
          entries,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
}

async function main() {
  loadDotEnv();
  const { authBaseUrl, apiBaseUrl } = getEnvironmentConfig();
  const { clientId, clientSecret } = requireCredentials();
  const accessToken = await getAccessToken(authBaseUrl, clientId, clientSecret);
  const tafsirs = await fetchTafsirs(apiBaseUrl, accessToken, clientId);
  const resourceId = Number(process.env.QF_TAFSIR_ID ?? DEFAULT_TAFSIR_ID);
  const resource = tafsirs.find((item) => item.id === resourceId);

  if (!resource) {
    throw new Error(`Quran Foundation tafsir resource ${resourceId} was not found.`);
  }

  const chapters: StudyEntry[][] = [];
  let totalEntries = 0;

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const entries = await fetchChapterTafsirs(
      apiBaseUrl,
      accessToken,
      clientId,
      resource,
      surahNumber,
    );
    chapters[surahNumber] = entries;
    totalEntries += entries.length;
    process.stdout.write(`\r${getName(resource)}: imported surah ${surahNumber}/114`);
  }

  process.stdout.write("\n");
  await writeSource(resource, chapters);
  console.log(`${getName(resource)}: ${totalEntries} entries imported.`);
  console.log("Generated QF tafsir data under lib/study/generated/tafsirs.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
