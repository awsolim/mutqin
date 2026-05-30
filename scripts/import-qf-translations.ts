import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

type QfEnvironment = "production" | "prelive";

type TranslationResource = {
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

type TranslationEntry = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  sourceId: string;
  sourceName: string;
};

const generatedRoot = path.join(process.cwd(), "lib", "translations", "generated");

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
    // Local env files are optional in CI/deploy shells.
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

async function fetchTranslations(apiBaseUrl: string, accessToken: string, clientId: string) {
  const data = (await fetchJson(`${apiBaseUrl}/resources/translations`, {
    headers: authHeaders(accessToken, clientId),
  })) as { translations?: TranslationResource[] } | TranslationResource[];

  return Array.isArray(data) ? data : data.translations ?? [];
}

function getName(resource: TranslationResource) {
  return String(resource.name ?? resource.translated_name?.name ?? resource.translatedName?.name ?? "");
}

function getAuthor(resource: TranslationResource) {
  return String(resource.author_name ?? resource.authorName ?? "");
}

function getLanguage(resource: TranslationResource) {
  return String(resource.language_name ?? resource.languageName ?? resource.language ?? "").toLowerCase();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function resourceMatches(resource: TranslationResource, needles: string[]) {
  const haystack = [getName(resource), getAuthor(resource), resource.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function selectResources(resources: TranslationResource[]) {
  const explicitIds = (process.env.QF_TRANSLATION_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id));

  if (explicitIds.length) {
    return explicitIds
      .map((id) => resources.find((resource) => resource.id === id))
      .filter((resource): resource is TranslationResource => Boolean(resource));
  }

  const english = resources.filter((resource) => {
    const language = getLanguage(resource);
    return language === "english" || language === "en";
  });
  const selected: TranslationResource[] = [];

  for (const needles of [
    ["sahih international", "saheeh international"],
    ["clear quran", "mustafa khattab", "khattab"],
  ]) {
    const match = english.find((resource) => resourceMatches(resource, needles));
    if (match && !selected.some((resource) => resource.id === match.id)) {
      selected.push(match);
    }
  }

  if (selected.length) {
    return selected;
  }

  const fallback =
    english.find((resource) => resourceMatches(resource, ["dr. mustafa", "abdul haleem"])) ??
    english.find((resource) => resourceMatches(resource, ["pickthall"])) ??
    english[0];

  return fallback ? [fallback] : [];
}

function normalizeTranslationHtml(text: string) {
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

function normalizeVerseTranslations(
  payload: unknown,
  resource: TranslationResource,
): TranslationEntry[] {
  const verses = ((payload as { verses?: unknown[] }).verses ?? []) as Array<{
    verse_key?: string;
    verseKey?: string;
    translations?: Array<{ text?: string; resource_id?: number; resourceId?: number }>;
  }>;
  const sourceId = `qf-${resource.id}-${slugify(getName(resource) || String(resource.id))}`;
  const sourceName = getName(resource);

  return verses.flatMap((verse) => {
    const parsed = parseVerseKey(verse.verse_key ?? verse.verseKey);
    if (!parsed) {
      return [];
    }

    return (verse.translations ?? [])
      .filter((translation) => {
        const id = translation.resource_id ?? translation.resourceId;
        return !id || id === resource.id;
      })
      .map((translation) => ({
        ...parsed,
        text: normalizeTranslationHtml(translation.text ?? ""),
        sourceId,
        sourceName,
      }))
      .filter((entry) => entry.text);
  });
}

async function fetchChapterTranslations(
  apiBaseUrl: string,
  accessToken: string,
  clientId: string,
  resource: TranslationResource,
  surahNumber: number,
) {
  const headers = authHeaders(accessToken, clientId);
  const urls = [
    `${apiBaseUrl}/verses/by_chapter/${surahNumber}?language=en&translations=${resource.id}&fields=verse_key&per_page=300`,
    `${apiBaseUrl}/verses/by_chapter/${surahNumber}?translations=${resource.id}&fields=verse_key&per_page=300`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchJson(url, { headers });
      const entries = normalizeVerseTranslations(payload, resource);
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

async function writeSource(resource: TranslationResource, chapters: TranslationEntry[][]) {
  const sourceId = `qf-${resource.id}-${slugify(getName(resource) || String(resource.id))}`;
  const sourceDir = path.join(generatedRoot, "sources", sourceId);
  await fsp.mkdir(sourceDir, { recursive: true });

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const entries = chapters[surahNumber] ?? [];
    await fsp.writeFile(
      path.join(sourceDir, `${String(surahNumber).padStart(3, "0")}.json`),
      `${JSON.stringify(
        {
          sourceId,
          sourceName: getName(resource),
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

  return {
    id: sourceId,
    name: getName(resource),
    author: getAuthor(resource) || null,
    language: "en",
    direction: "ltr",
    resourceId: resource.id ?? null,
    source: "Quran Foundation",
    importedAt: new Date().toISOString(),
    notes: [
      "Imported with Quran Foundation Content API using server-side app credentials.",
      "Do not expose Quran Foundation credentials to client code.",
    ],
  };
}

async function main() {
  loadDotEnv();
  const { authBaseUrl, apiBaseUrl } = getEnvironmentConfig();
  const { clientId, clientSecret } = requireCredentials();
  const accessToken = await getAccessToken(authBaseUrl, clientId, clientSecret);
  const resources = await fetchTranslations(apiBaseUrl, accessToken, clientId);
  const selected = selectResources(resources);

  if (!selected.length) {
    const languageSample = resources
      .slice(0, 12)
      .map((resource) => `${resource.id ?? "?"}:${getName(resource) || "unnamed"}:${getLanguage(resource) || "no-language"}`)
      .join(" | ");
    throw new Error(
      `No English Quran Foundation translation resources were available to import. Resources found: ${resources.length}. Sample: ${languageSample}`,
    );
  }

  console.log("Selected translation resources:");
  selected.forEach((resource) => {
    console.log(`- ${resource.id}: ${getName(resource)} (${getAuthor(resource) || "unknown"})`);
  });

  await fsp.mkdir(path.join(generatedRoot, "sources"), { recursive: true });
  const sourceSummaries = [];

  for (const resource of selected) {
    const chapters: TranslationEntry[][] = [];
    let totalEntries = 0;

    for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
      const entries = await fetchChapterTranslations(
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
    const summary = await writeSource(resource, chapters);
    sourceSummaries.push(summary);
    console.log(`${summary.name}: ${totalEntries} entries imported.`);
  }

  await fsp.writeFile(
    path.join(generatedRoot, "sources.json"),
    `${JSON.stringify(sourceSummaries, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${sourceSummaries.length} translation source(s) in lib/translations/generated.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
