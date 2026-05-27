"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { type Note, type NoteActionResult, type NoteInput, type NoteRow } from "./types";

function mapNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    surahNumber: row.surah_number,
    ayahStart: row.ayah_start,
    ayahEnd: row.ayah_end,
    pageNumber: row.page_number,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanTitle(title?: string | null) {
  const value = title?.trim();

  return value ? value : null;
}

function cleanBody(body: string) {
  return body.trim();
}

function validateInput(input: NoteInput): string | null {
  if (!["ayah", "range", "surah"].includes(input.type)) {
    return "Invalid note type.";
  }

  if (!Number.isInteger(input.surahNumber) || input.surahNumber < 1 || input.surahNumber > 114) {
    return "Invalid surah number.";
  }

  if (!cleanBody(input.body)) {
    return "Note body is required.";
  }

  if (input.type === "ayah" && !input.ayahStart) {
    return "Ayah notes need an ayah number.";
  }

  if (input.type === "range") {
    if (!input.ayahStart || !input.ayahEnd) {
      return "Range notes need a start and end ayah.";
    }

    if (input.ayahEnd < input.ayahStart) {
      return "Range end must be after the start.";
    }
  }

  return null;
}

export async function createNote(input: NoteInput): Promise<NoteActionResult> {
  const error = validateInput(input);

  if (error) {
    return { ok: false, message: error };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error: insertError } = await supabase.from("notes").insert({
    user_id: user.id,
    type: input.type,
    surah_number: input.surahNumber,
    ayah_start: input.ayahStart ?? null,
    ayah_end: input.ayahEnd ?? null,
    page_number: input.pageNumber ?? null,
    title: cleanTitle(input.title),
    body: cleanBody(input.body),
  });

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  revalidatePath("/app/notes");
  revalidatePath("/app/library");

  return { ok: true, message: "Note saved." };
}

export async function updateNote(
  noteId: string,
  input: Pick<NoteInput, "title" | "body">,
): Promise<NoteActionResult> {
  if (!cleanBody(input.body)) {
    return { ok: false, message: "Note body is required." };
  }

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notes")
    .update({
      title: cleanTitle(input.title),
      body: cleanBody(input.body),
    })
    .eq("id", noteId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/app/notes");
  revalidatePath("/app/library");

  return { ok: true, message: "Note updated." };
}

export async function deleteNote(noteId: string): Promise<NoteActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/app/notes");
  revalidatePath("/app/library");

  return { ok: true, message: "Note deleted." };
}

export async function getNotesForUser() {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as NoteRow[]).map(mapNote);
}

export async function getNotesForSurah(surahNumber: number) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("surah_number", surahNumber)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as NoteRow[]).map(mapNote);
}

export async function getNotesForAyah(surahNumber: number, ayahNumber: number) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("surah_number", surahNumber)
    .lte("ayah_start", ayahNumber)
    .or(`ayah_end.is.null,ayah_end.gte.${ayahNumber}`)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as NoteRow[]).map(mapNote);
}
