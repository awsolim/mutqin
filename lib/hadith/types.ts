export type HadithCollectionMap = {
  aliases: string[];
  displayName: string;
  providerSlugs: Record<string, string>;
  slug: string;
};

export type ParsedHadithReference = {
  collection: string;
  collectionSlug: string;
  correctedReference?: string;
  hadithNumber: string;
  matchedAlias?: string;
  providerCollectionSlug?: string;
  raw: string;
};

export type NormalizedHadith = {
  collection: string;
  collectionSlug: string;
  reference: string;
  hadithNumber: string;
  arabicText?: string;
  englishText?: string;
  narrator?: string;
  grade?: string;
  chapter?: string;
  book?: string;
  provider: string;
  providerHadithId?: string;
  sourceUrl?: string;
};
