"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateAyahInsightInput,
  type CreateSurahNoteInput,
  type CollectionItemInput,
  type BookmarkPageMarker,
  type BookmarkMarkersByPage,
  type LibraryActionResult,
  type LibraryItem,
  type LibraryItemRow,
  type LibraryItemType,
  type ToggleBookmarkInput,
} from "./types";
import { cleanSurahNoteTagIds, type SurahNoteTag } from "./surah-note-tags";

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
  revalidatePath("/app/library/duas");
  revalidatePath("/app/library/hadiths");
  revalidatePath("/app/library/khutbahs");
}

function cleanTags(tags?: string[]) {
  return Array.from(
    new Set(
      (tags ?? [])
        .flatMap((tag) => tag.split(","))
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
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
    metadata: {
      surahNoteTagIds: cleanSurahNoteTagIds(input.surahNoteTagIds),
    },
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

  const title = cleanText(input.title);
  const bullets = (input.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);

  if (!title) {
    return { ok: false, message: "Tag title is required." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    user_id: user.id,
    type: "surah_note",
    title,
    body: bullets.length ? bullets.map((bullet) => `- ${bullet}`).join("\n") : null,
    surah_number: input.surahNumber,
    ayah_start: null,
    ayah_end: null,
    verse_key: null,
    page_number: null,
    metadata: { bullets, kind: "surah_tag" },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();

  return { ok: true, message: "Surah tag saved." };
}

export async function getSurahNoteTagsForSurahs(
  surahNumbers: number[],
): Promise<SurahNoteTag[]> {
  const cleanSurahNumbers = Array.from(
    new Set(
      surahNumbers.filter(
        (surahNumber) =>
          Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114,
      ),
    ),
  );

  if (!cleanSurahNumbers.length) {
    return [];
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("id, title, surah_number")
    .eq("user_id", user.id)
    .eq("type", "surah_note")
    .in("surah_number", cleanSurahNumbers)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ id: string; title: string | null; surah_number: number | null }>)
    .filter(
      (item): item is { id: string; title: string; surah_number: number } =>
        Boolean(item.title) && Number.isInteger(item.surah_number),
    )
    .map((item) => ({
      id: item.id,
      surahNumber: item.surah_number,
      title: item.title,
    }));
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

export async function createCollectionItem(
  input: CollectionItemInput,
): Promise<LibraryActionResult> {
  // Future verified-source imports should normalize into this metadata shape, not bypass user-owned Library storage.
  const title = cleanText(input.title);

  if (input.type !== "dua" && input.type !== "hadith" && input.type !== "khutbah") {
    return { ok: false, message: "Invalid collection type." };
  }

  if (!title) {
    return { ok: false, message: "Title is required." };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .insert({
      user_id: user.id,
      type: input.type,
      title,
      body: cleanText(input.body),
      metadata: {
        arabicText: cleanText(input.arabicText),
        sanadText: cleanText(input.sanadText),
        matnText: cleanText(input.matnText),
        quoteText: cleanText(input.quoteText),
        translation: cleanText(input.translation),
        transliteration: cleanText(input.transliteration),
        source: cleanText(input.source),
        reference: cleanText(input.reference),
        category: cleanText(input.category),
        collection: cleanText(input.collection),
        narrator: cleanText(input.narrator),
        grade: cleanText(input.grade),
        book: cleanText(input.book),
        chapter: cleanText(input.chapter),
        provider: cleanText(input.provider),
        providerHadithId: cleanText(input.providerHadithId),
        sourceUrl: cleanText(input.sourceUrl),
        arabicMarkers: input.arabicMarkers ?? [],
        translationMarkers: input.translationMarkers ?? [],
        duaEntries: input.duaEntries ?? [],
        khutbahKind: cleanText(input.khutbahKind),
        khutbahReferences: input.khutbahReferences ?? [],
        tags: cleanTags(input.tags),
        pinned: Boolean(input.pinned),
      },
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();
  revalidatePath(`/app/library/${input.type === "dua" ? "duas" : input.type === "hadith" ? "hadiths" : "khutbahs"}/${data.id}`);

  return { id: data.id, ok: true, message: "Saved." };
}

export async function updateCollectionItem(
  input: CollectionItemInput & { id: string },
): Promise<LibraryActionResult> {
  const title = cleanText(input.title);

  if (input.type !== "dua" && input.type !== "hadith" && input.type !== "khutbah") {
    return { ok: false, message: "Invalid collection type." };
  }

  if (!title) {
    return { ok: false, message: "Title is required." };
  }

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_items")
    .update({
      title,
      body: cleanText(input.body),
      metadata: {
        arabicText: cleanText(input.arabicText),
        sanadText: cleanText(input.sanadText),
        matnText: cleanText(input.matnText),
        quoteText: cleanText(input.quoteText),
        translation: cleanText(input.translation),
        transliteration: cleanText(input.transliteration),
        source: cleanText(input.source),
        reference: cleanText(input.reference),
        category: cleanText(input.category),
        collection: cleanText(input.collection),
        narrator: cleanText(input.narrator),
        grade: cleanText(input.grade),
        book: cleanText(input.book),
        chapter: cleanText(input.chapter),
        provider: cleanText(input.provider),
        providerHadithId: cleanText(input.providerHadithId),
        sourceUrl: cleanText(input.sourceUrl),
        arabicMarkers: input.arabicMarkers ?? [],
        translationMarkers: input.translationMarkers ?? [],
        duaEntries: input.duaEntries ?? [],
        khutbahKind: cleanText(input.khutbahKind),
        khutbahReferences: input.khutbahReferences ?? [],
        tags: cleanTags(input.tags),
        pinned: Boolean(input.pinned),
      },
    })
    .eq("id", input.id)
    .eq("type", input.type);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateLibrary();
  revalidatePath(`/app/library/${input.type === "dua" ? "duas" : input.type === "hadith" ? "hadiths" : "khutbahs"}/${input.id}`);

  return { id: input.id, ok: true, message: "Saved." };
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

export async function getBookmarkMarkersForPages(
  pageNumbers: number[],
): Promise<BookmarkMarkersByPage> {
  const uniquePageNumbers = Array.from(
    new Set(
      pageNumbers.filter(
        (pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604,
      ),
    ),
  );

  if (!uniquePageNumbers.length) {
    return {};
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .select("page_number, verse_key")
    .eq("user_id", user.id)
    .eq("type", "bookmark")
    .in("page_number", uniquePageNumbers);

  if (error) {
    throw new Error(error.message);
  }

  const groupedMarkers = Object.fromEntries(
    uniquePageNumbers.map((pageNumber) => [pageNumber, [] as BookmarkPageMarker[]]),
  ) as BookmarkMarkersByPage;

  for (const item of (data ?? []) as Array<{ page_number: number | null; verse_key: string | null }>) {
    if (item.page_number && item.verse_key) {
      groupedMarkers[item.page_number] = [
        ...(groupedMarkers[item.page_number] ?? []),
        { verseKey: item.verse_key },
      ];
    }
  }

  return groupedMarkers;
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

export async function getLibraryItemById(itemId: string, type?: LibraryItemType) {
  await requireUser();
  const supabase = await createClient();
  let query = supabase.from("library_items").select("*").eq("id", itemId);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapLibraryItem(data as LibraryItemRow) : null;
}
