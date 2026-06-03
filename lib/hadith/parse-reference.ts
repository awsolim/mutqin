import { type HadithCollectionMap, type ParsedHadithReference } from "./types";

export const HADITH_COLLECTIONS: HadithCollectionMap[] = [
  {
    aliases: [
      "sahih al bukhari",
      "sahih bukhari",
      "bukhari",
      "bukari",
      "bukhary",
      "bukharee",
    ],
    displayName: "Sahih al-Bukhari",
    providerSlugs: { hadithapi: "sahih-bukhari" },
    slug: "bukhari",
  },
  {
    aliases: ["sahih muslim", "muslim", "moslim"],
    displayName: "Sahih Muslim",
    providerSlugs: { hadithapi: "sahih-muslim" },
    slug: "muslim",
  },
  {
    aliases: [
      "jami at tirmidhi",
      "jami al tirmidhi",
      "al tirmidhi",
      "tirmidhi",
      "tirmidi",
      "tirmizi",
      "tirmizy",
    ],
    displayName: "Jami at-Tirmidhi",
    providerSlugs: { hadithapi: "al-tirmidhi" },
    slug: "tirmidhi",
  },
  {
    aliases: [
      "sunan abi dawud",
      "sunan abu dawud",
      "abu dawud",
      "abu dawood",
      "abudawud",
      "abudawood",
    ],
    displayName: "Sunan Abi Dawud",
    providerSlugs: { hadithapi: "abu-dawood" },
    slug: "abu-dawud",
  },
  {
    aliases: [
      "sunan an nasai",
      "sunan al nasai",
      "sunan nasai",
      "nasa'i",
      "nasai",
      "nasaii",
      "nasayi",
      "nasaee",
    ],
    displayName: "Sunan an-Nasa'i",
    providerSlugs: { hadithapi: "sunan-nasai" },
    slug: "nasai",
  },
  {
    aliases: ["sunan ibn majah", "ibn majah", "ibn maja", "ibne majah"],
    displayName: "Sunan Ibn Majah",
    providerSlugs: { hadithapi: "ibn-e-majah" },
    slug: "ibn-majah",
  },
  {
    aliases: ["muwatta malik", "muwatta imam malik", "malik"],
    displayName: "Muwatta Malik",
    providerSlugs: { hadithapi: "muwatta-malik" },
    slug: "malik",
  },
  {
    aliases: ["mishkat al masabih", "mishkat al-masabih", "mishkat", "mishkaat"],
    displayName: "Mishkat Al-Masabih",
    providerSlugs: { hadithapi: "mishkat" },
    slug: "mishkat",
  },
  {
    aliases: ["musnad ahmad", "ahmad", "musnad imam ahmad"],
    displayName: "Musnad Ahmad",
    providerSlugs: { hadithapi: "musnad-ahmad" },
    slug: "musnad-ahmad",
  },
  {
    aliases: [
      "al silsila sahiha",
      "silsila sahiha",
      "silsilah sahiha",
      "silsilah sahihah",
    ],
    displayName: "Al-Silsila Sahiha",
    providerSlugs: { hadithapi: "al-silsila-sahiha" },
    slug: "al-silsila-sahiha",
  },
];

function normalizeReference(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[-_./]+/g, " ")
    .replace(/\s+/g, " ");
}

function getAliases() {
  return HADITH_COLLECTIONS.flatMap((collection) =>
    collection.aliases.map((alias) => ({
      alias: normalizeReference(alias),
      collection,
    })),
  ).sort((a, b) => b.alias.length - a.alias.length);
}

function levenshteinDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length];
}

function splitReference(value: string) {
  const match = value.match(/^(.+?)\s+([\d/.-]+)$/);

  if (!match) return null;

  return {
    collectionText: normalizeReference(match[1]),
    hadithNumber: match[2],
  };
}

function getFuzzyMatch(collectionText: string) {
  const aliases = getAliases();
  const bestMatch = aliases
    .map((candidate) => ({
      ...candidate,
      distance: levenshteinDistance(collectionText, candidate.alias),
    }))
    .sort((a, b) => a.distance - b.distance || a.alias.length - b.alias.length)[0];

  if (!bestMatch) return null;

  const allowedDistance = collectionText.length <= 7 ? 2 : 3;

  return bestMatch.distance <= allowedDistance ? bestMatch : null;
}

export function parseHadithReference(
  value: string,
  provider = "hadithapi",
): ParsedHadithReference | null {
  const normalizedValue = normalizeReference(value);
  const aliases = getAliases();

  for (const { alias, collection } of aliases) {
    if (!normalizedValue.startsWith(`${alias} `)) continue;

    const hadithNumber = normalizedValue.slice(alias.length).trim();

    if (!/^[\d/.-]+$/.test(hadithNumber)) {
      return null;
    }

    return {
      collection: collection.displayName,
      collectionSlug: collection.slug,
      hadithNumber,
      matchedAlias: alias,
      providerCollectionSlug: collection.providerSlugs[provider],
      raw: value,
    };
  }

  const split = splitReference(normalizedValue);
  const fuzzyMatch = split ? getFuzzyMatch(split.collectionText) : null;

  if (split && fuzzyMatch) {
    return {
      collection: fuzzyMatch.collection.displayName,
      collectionSlug: fuzzyMatch.collection.slug,
      correctedReference: `${fuzzyMatch.collection.displayName} ${split.hadithNumber}`,
      hadithNumber: split.hadithNumber,
      matchedAlias: fuzzyMatch.alias,
      providerCollectionSlug: fuzzyMatch.collection.providerSlugs[provider],
      raw: value,
    };
  }

  return null;
}
