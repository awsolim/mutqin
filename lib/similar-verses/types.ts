export type SimilarVerseHighlightType =
  | "same"
  | "difference"
  | "memory"
  | "universal_shared"
  | "partial_shared"
  | "identity_marker"
  | "outlier"
  | "ending_family"
  | "ending_outlier"
  | "memory_clue";

export type SimilarVerseSetRow = {
  id: string;
  user_id: string;
  family_title: string | null;
  title: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type SimilarVerseItemRow = {
  id: string;
  set_id: string;
  user_id: string;
  surah_number: number;
  ayah_number: number;
  verse_key: string;
  page_number: number | null;
  role: string | null;
  sort_order: number;
  created_at: string;
};

export type SimilarVerseHighlightRow = {
  id: string;
  set_id: string;
  item_id: string;
  user_id: string;
  verse_key: string;
  start_word_position: number;
  end_word_position: number;
  label: string | null;
  type: SimilarVerseHighlightType;
  note: string | null;
  created_at: string;
};

export type SimilarVerseSet = {
  id: string;
  userId: string;
  familyTitle: string | null;
  title: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SimilarVerseItem = {
  id: string;
  setId: string;
  userId: string;
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number | null;
  role: string | null;
  sortOrder: number;
  createdAt: string;
};

export type SimilarVerseHighlight = {
  id: string;
  setId: string;
  itemId: string;
  userId: string;
  verseKey: string;
  startWordPosition: number;
  endWordPosition: number;
  label: string | null;
  type: SimilarVerseHighlightType;
  note: string | null;
  createdAt: string;
};

export type SimilarVerseRecord = SimilarVerseSet & {
  items: SimilarVerseItem[];
  highlights: SimilarVerseHighlight[];
};

export type SimilarVerseDraftItem = {
  surahNumber: number;
  ayahNumber: number;
  verseKey: string;
  pageNumber: number;
  text: string;
  words: Array<{
    text: string;
    wordPosition: number;
  }>;
};

export type CreateSimilarVerseSetInput = {
  familyTitle?: string;
  title?: string;
  note?: string;
  items: Array<{
    surahNumber: number;
    ayahNumber: number;
    verseKey: string;
    pageNumber: number | null;
    role?: string | null;
  }>;
  highlights: Array<{
    verseKey: string;
    startWordPosition: number;
    endWordPosition: number;
    type: SimilarVerseHighlightType;
    label?: string | null;
    note?: string | null;
  }>;
};

export type SimilarVerseActionResult = {
  id?: string;
  message: string;
  ok: boolean;
};

export type SimilarVersePageLink = {
  note: string | null;
  setId: string;
  title: string | null;
  verseKey: string;
  references: string[];
};
