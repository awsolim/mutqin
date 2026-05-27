import { type Note } from "./types";

export function formatNoteReference(
  note: Pick<Note, "type" | "surahNumber" | "ayahStart" | "ayahEnd">,
  surahName?: string,
) {
  const name = surahName ?? `Surah ${note.surahNumber}`;

  if (note.type === "surah") {
    return `Surah ${name}`;
  }

  if (note.type === "range" && note.ayahStart && note.ayahEnd) {
    return `${name} ${note.surahNumber}:${note.ayahStart}-${note.surahNumber}:${note.ayahEnd}`;
  }

  if (note.ayahStart) {
    return `${name} ${note.surahNumber}:${note.ayahStart}`;
  }

  return name;
}
