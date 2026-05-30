import fs from "node:fs";

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
  translated_name?: { name?: string; language_name?: string };
  translatedName?: { name?: string; languageName?: string };
  license?: string;
  copyright?: string;
  [key: string]: unknown;
};

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

function getAuthor(resource: TafsirResource) {
  return String(resource.author_name ?? resource.authorName ?? "");
}

function getLanguage(resource: TafsirResource) {
  return String(resource.language_name ?? resource.languageName ?? resource.language ?? "").toLowerCase();
}

function matches(resource: TafsirResource, needles: string[]) {
  const haystack = [
    getName(resource),
    getAuthor(resource),
    resource.slug,
    resource.translated_name?.name,
    resource.translatedName?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function printResource(resource: TafsirResource) {
  console.log(
    JSON.stringify(
      {
        id: resource.id,
        name: getName(resource),
        author: getAuthor(resource),
        language: getLanguage(resource),
        slug: resource.slug ?? null,
        license: resource.license ?? null,
        copyright: resource.copyright ?? null,
      },
      null,
      2,
    ),
  );
}

async function main() {
  loadDotEnv();
  const { authBaseUrl, apiBaseUrl } = getEnvironmentConfig();
  const { clientId, clientSecret } = requireCredentials();
  const accessToken = await getAccessToken(authBaseUrl, clientId, clientSecret);
  const tafsirs = await fetchTafsirs(apiBaseUrl, accessToken, clientId);

  console.log(`Found ${tafsirs.length} Quran Foundation tafsir resources.`);

  const english = tafsirs.filter((resource) => {
    const language = getLanguage(resource);
    return language === "english" || language === "en";
  });
  const arabic = tafsirs.filter((resource) => {
    const language = getLanguage(resource);
    return language === "arabic" || language === "ar";
  });

  console.log(`English tafsirs: ${english.length}`);
  console.log(`Arabic tafsirs: ${arabic.length}`);

  const priorityGroups = [
    ["Ibn Kathir", ["ibn kathir", "kathir", "ibn katheer"]],
    ["Jalalayn", ["jalalayn", "jalalain", "الجلالين"]],
    ["As-Saadi", ["saadi", "sa'di", "السعدي"]],
    ["Muyassar", ["muyassar", "الميسر"]],
  ] as const;

  for (const [label, needles] of priorityGroups) {
    const resources = tafsirs.filter((resource) => matches(resource, [...needles]));
    console.log(`\n${label}: ${resources.length ? "" : "not found"}`);
    resources.forEach(printResource);
  }

  console.log("\nEnglish tafsir resources:");
  english
    .sort((a, b) => getName(a).localeCompare(getName(b)))
    .forEach(printResource);

  console.log("\nArabic tafsir resources:");
  arabic
    .sort((a, b) => getName(a).localeCompare(getName(b)))
    .forEach(printResource);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
