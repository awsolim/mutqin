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

export type CreateAyahInsightInput = {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number;
  title?: string | null;
  body: string;
};

export type ToggleBookmarkInput = {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number;
};
