export type IrabSource =
  | "Furqan - Al-Karbasi"
  | "Furqan - Muyassar"
  | "Quran-Database";

export type IrabSourceId = "furqan-karbasi" | "furqan-muyassar" | "quran-database";

export type IrabEntry = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  text: string;
  source: IrabSource;
  sourceId?: IrabSourceId;
};

export type IrabSurahFile = {
  source: IrabSource;
  sourceId?: IrabSourceId;
  surahNumber: number;
  entries: IrabEntry[];
};
