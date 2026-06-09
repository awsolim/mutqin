"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type CreateSimilarVerseSetInput,
  type SimilarVerseActionResult,
  type SimilarVerseHighlight,
  type SimilarVerseHighlightRow,
  type SimilarVerseItem,
  type SimilarVerseItemRow,
  type SimilarVersePageLink,
  type SimilarVerseRecord,
  type SimilarVerseSet,
  type SimilarVerseSetRow,
} from "./types";

function cleanText(value?: string | null) {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

function mapSet(row: SimilarVerseSetRow): SimilarVerseSet {
  return {
    familyTitle: row.family_title,
    id: row.id,
    userId: row.user_id,
    title: row.title,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: SimilarVerseItemRow): SimilarVerseItem {
  return {
    id: row.id,
    setId: row.set_id,
    userId: row.user_id,
    surahNumber: row.surah_number,
    ayahNumber: row.ayah_number,
    verseKey: row.verse_key,
    pageNumber: row.page_number,
    role: row.role,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapHighlight(row: SimilarVerseHighlightRow): SimilarVerseHighlight {
  const preservedType = getPreservedHighlightType(row.note);
  const preservedLabel = getPreservedHighlightLabel(row.note);

  return {
    id: row.id,
    setId: row.set_id,
    itemId: row.item_id,
    userId: row.user_id,
    verseKey: row.verse_key,
    startWordPosition: row.start_word_position,
    endWordPosition: row.end_word_position,
    label: row.label ?? preservedLabel,
    type: preservedType ?? normalizeHighlightType(row.type),
    note: stripPreservedHighlightMetadata(row.note),
    createdAt: row.created_at,
  };
}

function getPreservedHighlightType(note: string | null) {
  const match = note?.match(/^__mutqin_highlight_type:(.*?)__\n?/m);

  return match?.[1] as SimilarVerseHighlight["type"] | undefined;
}

function getPreservedHighlightLabel(note: string | null) {
  const match = note?.match(/^__mutqin_highlight_label:(.*?)__\n?/m);

  return match?.[1] || null;
}

function stripPreservedHighlightMetadata(note: string | null) {
  return (
    note
      ?.replace(/^__mutqin_highlight_type:.*?__\n?/gm, "")
      .replace(/^__mutqin_highlight_label:.*?__\n?/gm, "")
      .trim() || null
  );
}

function serializeHighlightNote(highlight: {
  label?: string | null;
  note?: string | null;
  type: SimilarVerseHighlight["type"];
}) {
  const metadata = [`__mutqin_highlight_type:${highlight.type}__`];
  const label = cleanText(highlight.label);
  const note = cleanText(highlight.note);

  if (label) {
    metadata.push(`__mutqin_highlight_label:${label}__`);
  }

  return [...metadata, note].filter(Boolean).join("\n");
}

function normalizeHighlightType(type: SimilarVerseHighlightRow["type"]): SimilarVerseHighlight["type"] {
  if (type === "same") {
    return "universal_shared";
  }

  if (type === "difference") {
    return "identity_marker";
  }

  if (type === "memory") {
    return "memory_clue";
  }

  return type;
}

function getLegacyHighlightType(type: CreateSimilarVerseSetInput["highlights"][number]["type"]) {
  if (type === "universal_shared" || type === "partial_shared") {
    return "same";
  }

  if (
    type === "identity_marker" ||
    type === "outlier" ||
    type === "ending_family" ||
    type === "ending_outlier"
  ) {
    return "difference";
  }

  return "memory_clue";
}

function revalidateSimilarVerses() {
  revalidatePath("/app/library");
  revalidatePath("/app/library/similar-verses");
  revalidatePath("/app/mushaf/[page]", "page");
}

function validateVerseItem(item: CreateSimilarVerseSetInput["items"][number]) {
  if (!Number.isInteger(item.surahNumber) || item.surahNumber < 1 || item.surahNumber > 114) {
    return "Invalid surah number.";
  }

  if (!Number.isInteger(item.ayahNumber) || item.ayahNumber < 1) {
    return "Invalid ayah number.";
  }

  if (item.pageNumber !== null && (!Number.isInteger(item.pageNumber) || item.pageNumber < 1 || item.pageNumber > 604)) {
    return "Invalid page number.";
  }

  if (item.verseKey !== `${item.surahNumber}:${item.ayahNumber}`) {
    return "Invalid verse key.";
  }

  return null;
}

export async function createSimilarVerseSet(
  input: CreateSimilarVerseSetInput,
): Promise<SimilarVerseActionResult> {
  if (!input.items.length) {
    return { ok: false, message: "Add at least one ayah first." };
  }

  const uniqueVerseKeys = new Set(input.items.map((item) => item.verseKey));

  if (uniqueVerseKeys.size !== input.items.length) {
    return { ok: false, message: "Remove duplicate ayat before saving." };
  }

  for (const item of input.items) {
    const error = validateVerseItem(item);

    if (error) {
      return { ok: false, message: error };
    }
  }

  const validVerseKeys = new Set(input.items.map((item) => item.verseKey));

  for (const highlight of input.highlights) {
    if (!validVerseKeys.has(highlight.verseKey)) {
      return { ok: false, message: "A highlight points to an ayah that is not in this record." };
    }

    if (
      !Number.isInteger(highlight.startWordPosition) ||
      !Number.isInteger(highlight.endWordPosition) ||
      highlight.startWordPosition < 1 ||
      highlight.endWordPosition < highlight.startWordPosition
    ) {
      return { ok: false, message: "Invalid highlight range." };
    }
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data: setRow, error: setError } = await supabase
    .from("similar_verse_sets")
    .insert({
      user_id: user.id,
      title: cleanText(input.title),
      note: cleanText(input.note),
    })
    .select("*")
    .single();

  if (setError || !setRow) {
    return { ok: false, message: setError?.message ?? "Unable to save record." };
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("similar_verse_items")
    .insert(
      input.items.map((item, index) => ({
        set_id: setRow.id,
        user_id: user.id,
        surah_number: item.surahNumber,
        ayah_number: item.ayahNumber,
        verse_key: item.verseKey,
        page_number: item.pageNumber,
        sort_order: index,
      })),
    )
    .select("*");

  if (itemsError || !itemRows) {
    await supabase.from("similar_verse_sets").delete().eq("id", setRow.id);
    return { ok: false, message: itemsError?.message ?? "Unable to save ayat." };
  }

  const itemsByVerseKey = new Map(
    (itemRows as SimilarVerseItemRow[]).map((item) => [item.verse_key, item]),
  );
  const highlightRows = input.highlights
    .map((highlight) => {
      const item = itemsByVerseKey.get(highlight.verseKey);

      if (!item) {
        return null;
      }

      return {
        set_id: setRow.id,
        item_id: item.id,
        user_id: user.id,
        verse_key: highlight.verseKey,
        start_word_position: highlight.startWordPosition,
        end_word_position: highlight.endWordPosition,
        type: highlight.type,
        note: serializeHighlightNote(highlight),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (highlightRows.length) {
    const { error: highlightsError } = await supabase
      .from("similar_verse_highlights")
      .insert(highlightRows);

    if (highlightsError) {
      const { error: legacyHighlightsError } = await supabase
        .from("similar_verse_highlights")
        .insert(
          highlightRows.map((highlight) => {
            return {
              ...highlight,
              type: getLegacyHighlightType(highlight.type),
            };
          }),
        );

      if (legacyHighlightsError) {
        await supabase.from("similar_verse_sets").delete().eq("id", setRow.id);
        return { ok: false, message: legacyHighlightsError.message };
      }
    }
  }

  revalidateSimilarVerses();

  return { id: setRow.id, ok: true, message: "Similar verses record saved." };
}

export async function updateSimilarVerseSet(
  id: string,
  input: CreateSimilarVerseSetInput,
): Promise<SimilarVerseActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error: setError } = await supabase
    .from("similar_verse_sets")
    .update({
      note: cleanText(input.note),
      title: cleanText(input.title),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (setError) {
    return { ok: false, message: setError.message };
  }

  const { error: deleteHighlightsError } = await supabase
    .from("similar_verse_highlights")
    .delete()
    .eq("set_id", id)
    .eq("user_id", user.id);

  if (deleteHighlightsError) {
    return { ok: false, message: deleteHighlightsError.message };
  }

  const { error: deleteItemsError } = await supabase
    .from("similar_verse_items")
    .delete()
    .eq("set_id", id)
    .eq("user_id", user.id);

  if (deleteItemsError) {
    return { ok: false, message: deleteItemsError.message };
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("similar_verse_items")
    .insert(
      input.items.map((item, index) => ({
        ayah_number: item.ayahNumber,
        page_number: item.pageNumber,
        set_id: id,
        sort_order: index,
        surah_number: item.surahNumber,
        user_id: user.id,
        verse_key: item.verseKey,
      })),
    )
    .select("*");

  if (itemsError || !itemRows) {
    return { ok: false, message: itemsError?.message ?? "Unable to save ayat." };
  }

  const itemsByVerseKey = new Map(
    (itemRows as SimilarVerseItemRow[]).map((item) => [item.verse_key, item]),
  );
  const highlightRows = input.highlights
    .map((highlight) => {
      const item = itemsByVerseKey.get(highlight.verseKey);

      if (!item) {
        return null;
      }

      return {
        end_word_position: highlight.endWordPosition,
        item_id: item.id,
        note: serializeHighlightNote(highlight),
        set_id: id,
        start_word_position: highlight.startWordPosition,
        type: highlight.type,
        user_id: user.id,
        verse_key: highlight.verseKey,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  if (highlightRows.length) {
    const { error: highlightsError } = await supabase
      .from("similar_verse_highlights")
      .insert(highlightRows);

    if (highlightsError) {
      const { error: legacyHighlightsError } = await supabase
        .from("similar_verse_highlights")
        .insert(
          highlightRows.map((highlight) => {
            return {
              ...highlight,
              type: getLegacyHighlightType(highlight.type),
            };
          }),
        );

      if (legacyHighlightsError) {
        return { ok: false, message: legacyHighlightsError.message };
      }
    }
  }

  revalidateSimilarVerses();

  return { id, ok: true, message: "Similar verses record updated." };
}

export async function getSimilarVerseRecords(): Promise<SimilarVerseRecord[]> {
  await requireUser();
  const supabase = await createClient();
  const { data: sets, error: setsError } = await supabase
    .from("similar_verse_sets")
    .select("*")
    .order("updated_at", { ascending: false });

  if (setsError) {
    throw new Error(setsError.message);
  }

  const setRows = (sets ?? []) as SimilarVerseSetRow[];
  const setIds = setRows.map((set) => set.id);

  if (!setIds.length) {
    return [];
  }

  const [{ data: items, error: itemsError }, { data: highlights, error: highlightsError }] =
    await Promise.all([
      supabase
        .from("similar_verse_items")
        .select("*")
        .in("set_id", setIds)
        .order("sort_order", { ascending: true }),
      supabase.from("similar_verse_highlights").select("*").in("set_id", setIds),
    ]);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (highlightsError) {
    throw new Error(highlightsError.message);
  }

  const mappedItems = ((items ?? []) as SimilarVerseItemRow[]).map(mapItem);
  const mappedHighlights = ((highlights ?? []) as SimilarVerseHighlightRow[]).map(mapHighlight);

  return setRows.map((row) => ({
    ...mapSet(row),
    items: mappedItems.filter((item) => item.setId === row.id),
    highlights: mappedHighlights.filter((highlight) => highlight.setId === row.id),
  }));
}

export async function getSimilarVerseRecord(id: string): Promise<SimilarVerseRecord | null> {
  await requireUser();
  const supabase = await createClient();
  const { data: setRow, error: setError } = await supabase
    .from("similar_verse_sets")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (setError) {
    throw new Error(setError.message);
  }

  if (!setRow) {
    return null;
  }

  const [{ data: items, error: itemsError }, { data: highlights, error: highlightsError }] =
    await Promise.all([
      supabase
        .from("similar_verse_items")
        .select("*")
        .eq("set_id", id)
        .order("sort_order", { ascending: true }),
      supabase.from("similar_verse_highlights").select("*").eq("set_id", id),
    ]);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  if (highlightsError) {
    throw new Error(highlightsError.message);
  }

  return {
    ...mapSet(setRow as SimilarVerseSetRow),
    items: ((items ?? []) as SimilarVerseItemRow[]).map(mapItem),
    highlights: ((highlights ?? []) as SimilarVerseHighlightRow[]).map(mapHighlight),
  };
}

export async function deleteSimilarVerseSet(id: string): Promise<SimilarVerseActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("similar_verse_sets").delete().eq("id", id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateSimilarVerses();

  return { ok: true, message: "Similar verses record removed." };
}

export async function getSimilarVerseLinksForPage(pageNumber: number): Promise<SimilarVersePageLink[]> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: items, error: itemsError } = await supabase
    .from("similar_verse_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("page_number", pageNumber);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as SimilarVerseItemRow[];
  const setIds = Array.from(new Set(itemRows.map((item) => item.set_id)));

  if (!setIds.length) {
    return [];
  }

  const [{ data: sets, error: setsError }, { data: allItems, error: allItemsError }] =
    await Promise.all([
      supabase.from("similar_verse_sets").select("*").in("id", setIds),
      supabase
        .from("similar_verse_items")
        .select("*")
        .in("set_id", setIds)
        .order("sort_order", { ascending: true }),
    ]);

  if (setsError) {
    throw new Error(setsError.message);
  }

  if (allItemsError) {
    throw new Error(allItemsError.message);
  }

  const setsById = new Map(((sets ?? []) as SimilarVerseSetRow[]).map((set) => [set.id, set]));
  const itemsBySetId = new Map<string, SimilarVerseItemRow[]>();

  for (const item of (allItems ?? []) as SimilarVerseItemRow[]) {
    itemsBySetId.set(item.set_id, [...(itemsBySetId.get(item.set_id) ?? []), item]);
  }

  return itemRows.map((item) => ({
    note: setsById.get(item.set_id)?.note ?? null,
    setId: item.set_id,
    title: setsById.get(item.set_id)?.title ?? null,
    verseKey: item.verse_key,
    references: (itemsBySetId.get(item.set_id) ?? []).map((recordItem) => recordItem.verse_key),
  }));
}

export async function getSimilarVerseLinksForPages(
  pageNumbers: number[],
): Promise<Record<number, SimilarVersePageLink[]>> {
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
  const { data: items, error: itemsError } = await supabase
    .from("similar_verse_items")
    .select("*")
    .eq("user_id", user.id)
    .in("page_number", uniquePageNumbers);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const itemRows = (items ?? []) as SimilarVerseItemRow[];
  const groupedLinks = Object.fromEntries(
    uniquePageNumbers.map((pageNumber) => [pageNumber, [] as SimilarVersePageLink[]]),
  ) as Record<number, SimilarVersePageLink[]>;
  const setIds = Array.from(new Set(itemRows.map((item) => item.set_id)));

  if (!setIds.length) {
    return groupedLinks;
  }

  const [{ data: sets, error: setsError }, { data: allItems, error: allItemsError }] =
    await Promise.all([
      supabase.from("similar_verse_sets").select("*").in("id", setIds),
      supabase
        .from("similar_verse_items")
        .select("*")
        .in("set_id", setIds)
        .order("sort_order", { ascending: true }),
    ]);

  if (setsError) {
    throw new Error(setsError.message);
  }

  if (allItemsError) {
    throw new Error(allItemsError.message);
  }

  const setsById = new Map(((sets ?? []) as SimilarVerseSetRow[]).map((set) => [set.id, set]));
  const itemsBySetId = new Map<string, SimilarVerseItemRow[]>();

  for (const item of (allItems ?? []) as SimilarVerseItemRow[]) {
    itemsBySetId.set(item.set_id, [...(itemsBySetId.get(item.set_id) ?? []), item]);
  }

  for (const item of itemRows) {
    if (!item.page_number) {
      continue;
    }

    groupedLinks[item.page_number] = [
      ...(groupedLinks[item.page_number] ?? []),
      {
        note: setsById.get(item.set_id)?.note ?? null,
        setId: item.set_id,
        title: setsById.get(item.set_id)?.title ?? null,
        verseKey: item.verse_key,
        references: (itemsBySetId.get(item.set_id) ?? []).map(
          (recordItem) => recordItem.verse_key,
        ),
      },
    ];
  }

  return groupedLinks;
}
