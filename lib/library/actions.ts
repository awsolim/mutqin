"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateAyahInsightInput,
  type CreateSurahNoteInput,
  type BookmarkPageMarker,
  type LibraryActionResult,
  type LibraryItem,
  type LibraryItemRow,
  type LibraryItemType,
  type ToggleBookmarkInput,
} from "./types";

function mapLibraryItem(row: LibraryItemRow): LibraryItem {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    surahNumber: row.surah_number,
    ayahStart: row.ayah_start,
    ayahEnd: row.ayah_end,
    verseKey: row.verse_key,
    pageNumber: row.page_number,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanText(value?: string | null) {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function revalidateLibrary() {
  revalidatePath("/app/library");
  revalidatePath("/app/library/ayah-insights");
  revalidatePath("/app/library/bookmarks");
  revalidatePath("/app/library/surah-notes");
}

function validateVerseLocation(input: {
  ayahNumber: number;
  pageNumber: number;
  surahNumber: number;
  verseKey: string;
}) {
  if (!Number.isInteger(input.surahNumber) || input.surahNumber < 1 || input.surahNumber > 114) {
    return "Invalid surah number.";
  }

  if (!Number.isInteger(input.ayahNumber) || input.ayahNumber < 1) {
    return "Invalid ayah number.";
  }

  if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1 || input.pageNumber > 604) {
    return "Invalid page number.";
  }

  if (!/^\d+:\d+$/.test(input.verseKey)) {
    return "Invalid verse reference.";
  }

  return null;
}

export async function createAyahInsight(
  input: CreateAyahInsightInput,
): Promise<LibraryActionResult> {
  const locationError = validateVerseLocation(input);
  const body = cleanText(input.body);

  if (locationError) {
    return { ok: false, message: locationError };
  }

  if (!body) {
    return { ok: false, message: "Insight body is required." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    user_id: user.id,
    type: "ayah_insight",
    title: cleanText(input.title),
    body,
    surah_number: input.surahNumber,
    ayah_start: input.ayahNumber,
    ayah_end: input.ayahNumber,
    verse_key: input.verseKey,
    page_number: input.pageNumber,
    metadata: {},
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();

  return { ok: true, message: "Ayah insight saved." };
}

export async function createSurahNote(
  input: CreateSurahNoteInput,
): Promise<LibraryActionResult> {
  if (!Number.isInteger(input.surahNumber) || input.surahNumber < 1 || input.surahNumber > 114) {
    return { ok: false, message: "Invalid surah number." };
  }

  const bullets = input.bullets.map((bullet) => bullet.trim()).filter(Boolean);

  if (!bullets.length) {
    return { ok: false, message: "Add at least one note." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    user_id: user.id,
    type: "surah_note",
    title: cleanText(input.title),
    body: bullets.map((bullet) => `- ${bullet}`).join("\n"),
    surah_number: input.surahNumber,
    ayah_start: null,
    ayah_end: null,
    verse_key: null,
    page_number: null,
    metadata: { bullets },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();

  return { ok: true, message: "Surah notes saved." };
}

export async function toggleBookmark(
  input: ToggleBookmarkInput,
): Promise<LibraryActionResult> {
  const locationError = validateVerseLocation(input);

  if (locationError) {
    return { ok: false, message: locationError };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("library_items")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "bookmark")
    .eq("verse_key", input.verseKey)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, message: fetchError.message };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("library_items")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateLibrary();

    return {
      id: existing.id,
      isBookmarked: false,
      ok: true,
      message: "Bookmark removed.",
    };
  }

  const { data, error } = await supabase
    .from("library_items")
    .insert({
      user_id: user.id,
      type: "bookmark",
      title: null,
      body: null,
      surah_number: input.surahNumber,
      ayah_start: input.ayahNumber,
      ayah_end: input.ayahNumber,
      verse_key: input.verseKey,
      page_number: input.pageNumber,
      metadata: {},
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();

  return {
    id: data.id,
    isBookmarked: true,
    ok: true,
    message: "Bookmark saved.",
  };
}

export async function getBookmarkForVerse(verseKey: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("type", "bookmark")
    .eq("verse_key", verseKey)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapLibraryItem(data as LibraryItemRow) : null;
}

export async function getBookmarkMarkersForPage(pageNumber: number): Promise<BookmarkPageMarker[]> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return [];
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("verse_key")
    .eq("user_id", user.id)
    .eq("type", "bookmark")
    .eq("page_number", pageNumber);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ verse_key: string | null }>)
    .filter((item): item is { verse_key: string } => Boolean(item.verse_key))
    .map((item) => ({ verseKey: item.verse_key }));
}

export async function deleteLibraryItem(itemId: string): Promise<LibraryActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").delete().eq("id", itemId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();

  return { ok: true, message: "Library item removed." };
}

export async function getLibraryItemsByType(type: LibraryItemType) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as LibraryItemRow[]).map(mapLibraryItem);
}
