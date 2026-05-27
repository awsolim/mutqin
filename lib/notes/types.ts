export type NoteType = "ayah" | "range" | "surah";

export type Note = {
  id: string;
  userId: string;
  type: NoteType;
  surahNumber: number;
  ayahStart: number | null;
  ayahEnd: number | null;
  pageNumber: number | null;
  title: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteInput = {
  type: NoteType;
  surahNumber: number;
  ayahStart?: number | null;
  ayahEnd?: number | null;
  pageNumber?: number | null;
  title?: string | null;
  body: string;
};

export type NoteActionResult = {
  ok: boolean;
  message: string;
};

export type NoteRow = {
  id: string;
  user_id: string;
  type: NoteType;
  surah_number: number;
  ayah_start: number | null;
  ayah_end: number | null;
  page_number: number | null;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};
