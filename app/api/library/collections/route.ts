import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { type CollectionItemInput } from "@/lib/library/types";
import { createClient } from "@/lib/supabase/server";

function cleanText(value?: string | null) {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
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

function collectionPath(type: CollectionItemInput["type"]) {
  return type === "dua" ? "duas" : "hadiths";
}

function metadataFromInput(input: CollectionItemInput) {
  return {
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
    tags: cleanTags(input.tags),
    pinned: Boolean(input.pinned),
  };
}

function revalidateCollection(type: CollectionItemInput["type"], id?: string) {
  revalidatePath("/app/library");
  revalidatePath(`/app/library/${collectionPath(type)}`);
  if (id) revalidatePath(`/app/library/${collectionPath(type)}/${id}`);
}

export async function POST(request: Request) {
  const input = (await request.json()) as CollectionItemInput;

  if (input.type !== "dua" && input.type !== "hadith") {
    return NextResponse.json({ message: "Invalid collection type.", ok: false }, { status: 400 });
  }

  const title = cleanText(input.title);

  if (!title) {
    return NextResponse.json({ message: "Title is required.", ok: false }, { status: 400 });
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .insert({
      body: cleanText(input.body),
      metadata: metadataFromInput(input),
      title,
      type: input.type,
      user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 500 });
  }

  revalidateCollection(input.type, data.id);

  return NextResponse.json({ id: data.id, message: "Saved.", ok: true });
}
