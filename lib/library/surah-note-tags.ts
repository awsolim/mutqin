import { type LibraryItem } from "@/lib/library/types";

export type SurahNoteTag = {
  id: string;
  surahNumber: number;
  title: string;
};

export function cleanSurahNoteTagIds(ids?: string[]) {
  return Array.from(
    new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)),
  );
}

export function getSurahNoteTagIdsFromMetadata(item: Pick<LibraryItem, "metadata">) {
  const value = item.metadata?.surahNoteTagIds;

  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    : [];
}

export function parseSimilarVerseNote(value: string | null) {
  if (!value?.trim()) {
    return { comments: [] as string[], surahNoteTagIds: [] as string[] };
  }

  try {
    const parsed = JSON.parse(value) as {
      comments?: unknown;
      kind?: string;
      surahNoteTagIds?: unknown;
    };

    if (parsed.kind === "mutqin-comments-v1") {
      return {
        comments: Array.isArray(parsed.comments)
          ? parsed.comments.filter(
              (comment): comment is string => typeof comment === "string" && Boolean(comment.trim()),
            )
          : [],
        surahNoteTagIds: Array.isArray(parsed.surahNoteTagIds)
          ? cleanSurahNoteTagIds(
              parsed.surahNoteTagIds.filter((id): id is string => typeof id === "string"),
            )
          : [],
      };
    }
  } catch {
    // Older records used plain text notes.
  }

  return { comments: [value], surahNoteTagIds: [] };
}

export function serializeSimilarVerseNote(input: {
  comments: string[];
  surahNoteTagIds?: string[];
}) {
  const comments = input.comments.map((comment) => comment.trim()).filter(Boolean);
  const surahNoteTagIds = cleanSurahNoteTagIds(input.surahNoteTagIds);

  return comments.length || surahNoteTagIds.length
    ? JSON.stringify({
        comments,
        kind: "mutqin-comments-v1",
        surahNoteTagIds,
      })
    : "";
}
