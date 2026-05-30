export type TranslationSource = {
  id: string;
  name: string;
  author?: string | null;
  language: "en";
  direction: "ltr";
  resourceId?: number | null;
  source: "Quran Foundation";
  importedAt?: string;
  notes?: string[];
};

export type TranslationEntry = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  sourceId: string;
  sourceName: string;
};

export type TranslationSurahFile = {
  sourceId: string;
  sourceName: string;
  language: "en";
  direction: "ltr";
  surahNumber: number;
  entries: TranslationEntry[];
};
