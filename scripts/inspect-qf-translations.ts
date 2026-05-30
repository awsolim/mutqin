import fs from "node:fs";

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
  translated_name?: { name?: string; language_name?: string };
  translatedName?: { name?: string; languageName?: string };
  info?: string;
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

function matches(resource: TranslationResource, needles: string[]) {
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

function printResource(resource: TranslationResource) {
  const safe = {
    id: resource.id,
    name: getName(resource),
    author: getAuthor(resource),
    language: getLanguage(resource),
    slug: resource.slug ?? null,
    license: resource.license ?? null,
    copyright: resource.copyright ?? null,
  };
  console.log(JSON.stringify(safe, null, 2));
}

async function main() {
  loadDotEnv();
  const { authBaseUrl, apiBaseUrl } = getEnvironmentConfig();
  const { clientId, clientSecret } = requireCredentials();
  const accessToken = await getAccessToken(authBaseUrl, clientId, clientSecret);
  const translations = await fetchTranslations(apiBaseUrl, accessToken, clientId);

  console.log(`Found ${translations.length} Quran Foundation translation resources.`);

  const english = translations.filter((resource) => {
    const language = getLanguage(resource);
    return language === "english" || language === "en";
  });
  console.log(`English resources: ${english.length}`);

  const priorityGroups = [
    ["Sahih International", ["sahih international", "saheeh international"]],
    ["The Clear Quran / Dr. Mustafa Khattab", ["clear quran", "mustafa khattab", "khattab"]],
  ] as const;

  for (const [label, needles] of priorityGroups) {
    const resources = translations.filter((resource) => matches(resource, [...needles]));
    console.log(`\n${label}: ${resources.length ? "" : "not found"}`);
    resources.forEach(printResource);
  }

  console.log("\nEnglish translations:");
  english
    .sort((a, b) => getName(a).localeCompare(getName(b)))
    .forEach((resource) => printResource(resource));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
