export type LibraryItemType =
  | "ayah_insight"
  | "surah_note"
  | "bookmark"
  | "similar_verses"
  | "dua"
  | "hadith"
  | "khutbah"
  | "seerah"
  | "companion";

export type LibraryItem = {
  id: string;
  userId: string;
  type: LibraryItemType;
  title: string | null;
  body: string | null;
  surahNumber: number | null;
  ayahStart: number | null;
  ayahEnd: number | null;
  verseKey: string | null;
  pageNumber: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LibraryItemRow = {
  id: string;
  user_id: string;
  type: LibraryItemType;
  title: string | null;
  body: string | null;
  surah_number: number | null;
  ayah_start: number | null;
  ayah_end: number | null;
  verse_key: string | null;
  page_number: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type LibraryActionResult = {
  id?: string;
  isBookmarked?: boolean;
  ok: boolean;
  message: string;
};

export type BookmarkPageMarker = {
  verseKey: string;
};

export type BookmarkMarkersByPage = Record<number, BookmarkPageMarker[]>;

export type CreateAyahInsightInput = {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number;
  title?: string | null;
  body: string;
};

export type CreateSurahNoteInput = {
  surahNumber: number;
  title?: string | null;
  bullets: string[];
};

export type CollectionItemKind = "dua" | "hadith";

export type CollectionItemInput = {
  id?: string;
  type: CollectionItemKind;
  title: string;
  arabicText?: string | null;
  sanadText?: string | null;
  matnText?: string | null;
  quoteText?: string | null;
  translation?: string | null;
  transliteration?: string | null;
  source?: string | null;
  reference?: string | null;
  category?: string | null;
  collection?: string | null;
  narrator?: string | null;
  grade?: string | null;
  book?: string | null;
  chapter?: string | null;
  provider?: string | null;
  providerHadithId?: string | null;
  sourceUrl?: string | null;
  arabicMarkers?: TextMarkerInput[];
  translationMarkers?: TextMarkerInput[];
  duaEntries?: DuaEntryInput[];
  tags?: string[];
  body?: string | null;
  pinned?: boolean;
};

export type DuaEntryInput = {
  id: string;
  arabicText: string;
  translation?: string | null;
  source?: string | null;
  reference?: string | null;
};

export type TextMarkerType = "sanad" | "matn" | "quote";

export type TextMarkerInput = {
  id: string;
  startWordPosition: number;
  endWordPosition: number;
  type: TextMarkerType;
};

export type ToggleBookmarkInput = {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number;
};
