export type StudyContentKind = "meaning" | "tafsir" | "translation";

export type StudyContentDirection = "ltr" | "rtl";

export type StudyContentEntry = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  kind: StudyContentKind;
  source: string;
  sourceId: string;
  language: "ar" | "en";
  direction: StudyContentDirection;
};

export type StudyContentSurahFile = {
  kind: StudyContentKind;
  source: string;
  sourceId: string;
  language: "ar" | "en";
  direction: StudyContentDirection;
  surahNumber: number;
  entries: StudyContentEntry[];
};
