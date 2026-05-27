import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

const MUSHAF_ID = 5;
const PAGE_COUNT = 604;
const GENERATED_DIR = path.join("lib", "quran", "generated");
const PAGES_DIR = path.join(GENERATED_DIR, "pages");

function loadDotEnv() {
  try {
    const content = fsSync.readFileSync(".env.local", "utf8");
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
    // .env.local is optional; real deployments can provide process env directly.
  }
}

function getEnvironmentConfig() {
  const env = process.env.QF_ENV ?? "prelive";

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
      "Missing QF_CLIENT_ID or QF_CLIENT_SECRET. Add server-only Quran Foundation credentials to .env.local before running import:mushaf.",
    );
  }

  return { clientId, clientSecret };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Quran Foundation request failed (${response.status}) for ${url}: ${body.slice(0, 300)}`,
    );
  }

  return JSON.parse(body);
}

async function getAccessToken(authBaseUrl, clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const data = await fetchJson(`${authBaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=content",
  });

  if (!data.access_token) {
    throw new Error("Quran Foundation token response did not include access_token.");
  }

  return data.access_token;
}

function authHeaders(accessToken, clientId) {
  return {
    "x-auth-token": accessToken,
    "x-client-id": clientId,
  };
}

function normalizeChapter(chapter) {
  return {
    number: chapter.id,
    arabicName: chapter.name_arabic ?? chapter.name,
    transliteratedName: chapter.name_simple ?? chapter.transliterated_name?.name,
    englishName: chapter.translated_name?.name ?? chapter.name_simple,
    revelationType:
      chapter.revelation_place === "madinah" || chapter.revelation_place === "medinan"
        ? "Medinan"
        : "Meccan",
    ayahCount: chapter.verses_count,
  };
}

async function fetchSurahs(apiBaseUrl, accessToken, clientId) {
  const data = await fetchJson(`${apiBaseUrl}/chapters?language=en`, {
    headers: authHeaders(accessToken, clientId),
  });
  const chapters = data.chapters ?? data;

  if (!Array.isArray(chapters) || chapters.length !== 114) {
    throw new Error("Expected 114 chapters from Quran Foundation chapters endpoint.");
  }

  return chapters.map(normalizeChapter);
}

function normalizeWord(word, verse) {
  const [surahNumber, ayahNumber] = verse.verse_key.split(":").map(Number);

  return {
    id: String(word.id ?? `${verse.verse_key}:${word.position}`),
    text: word.text_qpc_hafs ?? word.text_uthmani ?? word.text ?? "",
    verseKey: verse.verse_key,
    surahNumber,
    ayahNumber,
    wordPosition: word.position,
    pageNumber: word.page_number ?? verse.page_number,
    lineNumber: word.line_number,
    charTypeName: word.char_type_name,
    codeV1: word.code_v1 ?? null,
    codeV2: word.code_v2 ?? null,
    textQpcHafs: word.text_qpc_hafs ?? null,
    textUthmani: word.text_uthmani ?? null,
    v1Page: word.v1_page ?? null,
    v2Page: word.v2_page ?? null,
  };
}

function groupPage(pageNumber, verses, surahsByNumber) {
  const linesByNumber = new Map();
  const verseKeys = [];
  const surahNumbers = new Set();

  for (const verse of verses) {
    if (!verseKeys.includes(verse.verse_key)) {
      verseKeys.push(verse.verse_key);
    }

    for (const word of verse.words ?? []) {
      if (!word.line_number) {
        continue;
      }

      const normalizedWord = normalizeWord(word, verse);
      surahNumbers.add(normalizedWord.surahNumber);

      if (!linesByNumber.has(normalizedWord.lineNumber)) {
        linesByNumber.set(normalizedWord.lineNumber, {
          lineNumber: normalizedWord.lineNumber,
          lineType: "ayah",
          surahNumber: normalizedWord.surahNumber,
          isCentered: false,
          words: [],
        });
      }

      linesByNumber.get(normalizedWord.lineNumber).words.push(normalizedWord);
    }
  }

  const lines = [...linesByNumber.values()].sort(
    (lineA, lineB) => lineA.lineNumber - lineB.lineNumber,
  );

  for (const verseKey of verseKeys) {
    const [surahNumber, ayahNumber] = verseKey.split(":").map(Number);
    if (ayahNumber !== 1) {
      continue;
    }

    const firstLineIndex = lines.findIndex((line) =>
      line.words.some((word) => word.verseKey === verseKey),
    );

    if (firstLineIndex === -1) {
      continue;
    }

    const firstLine = lines[firstLineIndex];
    const previousLineNumber = lines[firstLineIndex - 1]?.lineNumber ?? 0;
    const availableLines = firstLine.lineNumber - previousLineNumber - 1;
    const needsBasmallah = surahNumber !== 1 && surahNumber !== 9;
    const titleLineNumber =
      needsBasmallah && availableLines >= 2
        ? firstLine.lineNumber - 2
        : firstLine.lineNumber - 1;
    const insertedLines = [{
      lineNumber: titleLineNumber,
      lineType: "surah_name",
      surahNumber,
      isCentered: true,
      label: surahsByNumber.get(surahNumber)?.arabicName ?? `سورة ${surahNumber}`,
      words: [],
    }];

    if (needsBasmallah) {
      insertedLines.push({
        lineNumber: firstLine.lineNumber - 1,
        lineType: "basmallah",
        surahNumber,
        isCentered: true,
        label: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        words: [],
      });
    }

    lines.splice(firstLineIndex, 0, ...insertedLines);
  }

  return {
    pageNumber,
    mushafId: MUSHAF_ID,
    lines,
    verseKeys,
    surahNumbers: [...surahNumbers].sort((a, b) => a - b),
  };
}

async function fetchPage(apiBaseUrl, accessToken, clientId, pageNumber, surahsByNumber) {
  const params = new URLSearchParams({
    mushaf: String(MUSHAF_ID),
    words: "true",
    per_page: "50",
    fields: "text_qpc_hafs,text_uthmani",
    word_fields:
      "code_v1,code_v2,text_qpc_hafs,text_uthmani,page_number,line_number,v1_page,v2_page,char_type_name",
  });
  const data = await fetchJson(`${apiBaseUrl}/verses/by_page/${pageNumber}?${params}`, {
    headers: authHeaders(accessToken, clientId),
  });

  return groupPage(pageNumber, data.verses ?? [], surahsByNumber);
}

function buildPageIndex(page) {
  return {
    pageNumber: page.pageNumber,
    firstVerseKey: page.verseKeys[0] ?? null,
    lastVerseKey: page.verseKeys.at(-1) ?? null,
    surahNumbers: page.surahNumbers,
  };
}

async function main() {
  loadDotEnv();

  const { clientId, clientSecret } = requireCredentials();
  const { authBaseUrl, apiBaseUrl } = getEnvironmentConfig();

  await fs.mkdir(PAGES_DIR, { recursive: true });

  console.log("Authenticating with Quran Foundation Content APIs...");
  const accessToken = await getAccessToken(authBaseUrl, clientId, clientSecret);

  console.log("Fetching surah metadata...");
  const surahs = await fetchSurahs(apiBaseUrl, accessToken, clientId);
  const surahsByNumber = new Map(surahs.map((surah) => [surah.number, surah]));
  await fs.writeFile(
    path.join(GENERATED_DIR, "surahs.json"),
    `${JSON.stringify(surahs, null, 2)}\n`,
  );

  const pageIndex = [];
  const surahFirstPages = {};

  for (let pageNumber = 1; pageNumber <= PAGE_COUNT; pageNumber += 1) {
    const page = await fetchPage(
      apiBaseUrl,
      accessToken,
      clientId,
      pageNumber,
      surahsByNumber,
    );
    const fileName = `page-${String(pageNumber).padStart(3, "0")}.json`;

    await fs.writeFile(
      path.join(PAGES_DIR, fileName),
      `${JSON.stringify(page, null, 2)}\n`,
    );

    pageIndex.push(buildPageIndex(page));

    for (const surahNumber of page.surahNumbers) {
      const firstVerseKey = `${surahNumber}:1`;
      if (!surahFirstPages[surahNumber] && page.verseKeys.includes(firstVerseKey)) {
        surahFirstPages[surahNumber] = pageNumber;
      }
    }

    if (pageNumber % 25 === 0 || pageNumber === PAGE_COUNT) {
      console.log(`Imported page ${pageNumber}/${PAGE_COUNT}`);
    }
  }

  await fs.writeFile(
    path.join(GENERATED_DIR, "page-index.json"),
    `${JSON.stringify(pageIndex, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(GENERATED_DIR, "surah-first-pages.json"),
    `${JSON.stringify(surahFirstPages, null, 2)}\n`,
  );

  console.log("Mushaf import complete.");
}

main().catch((error) => {
  console.error(error.message);
  if (error.cause) {
    console.error(error.cause);
  }
  process.exit(1);
});
