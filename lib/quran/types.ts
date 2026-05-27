export type RevelationType = "Meccan" | "Medinan";

export type Surah = {
  number: number;
  arabicName: string;
  transliteratedName: string;
  englishName: string;
  revelationType?: RevelationType;
  ayahCount: number;
};

export type Ayah = {
  surahNumber: number;
  ayahNumber: number;
  key: string;
  globalAyahNumber: number;
  text: string;
};

export type MushafWord = {
  id: string;
  text: string;
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  wordPosition: number;
  pageNumber: number;
  lineNumber: number;
  charTypeName?: string;
  codeV1?: string | null;
  codeV2?: string | null;
  textQpcHafs?: string | null;
  textUthmani?: string | null;
  v1Page?: number | null;
  v2Page?: number | null;
};

export type MushafLine = {
  lineNumber: number;
  lineType: "surah_name" | "basmallah" | "ayah";
  surahNumber?: number;
  isCentered: boolean;
  label?: string;
  words: MushafWord[];
};

export type MushafPage = {
  pageNumber: number;
  mushafId: number;
  lines: MushafLine[];
  verseKeys: string[];
  surahNumbers: number[];
};

export type PageIndexEntry = {
  pageNumber: number;
  firstVerseKey: string | null;
  lastVerseKey: string | null;
  surahNumbers: number[];
};

export type SelectedAyah = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  text: string;
};
