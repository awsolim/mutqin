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
  if (type === "dua") return "duas";
  if (type === "hadith") return "hadiths";

  return "khutbahs";
}

function isCollectionType(type: unknown): type is CollectionItemInput["type"] {
  return type === "dua" || type === "hadith" || type === "khutbah";
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
    duaEntries: input.duaEntries ?? [],
    khutbahKind: cleanText(input.khutbahKind),
    khutbahReferences: input.khutbahReferences ?? [],
    tags: cleanTags(input.tags),
    pinned: Boolean(input.pinned),
  };
}

function revalidateCollection(type: CollectionItemInput["type"], id: string) {
  revalidatePath("/app/library");
  revalidatePath(`/app/library/${collectionPath(type)}`);
  revalidatePath(`/app/library/${collectionPath(type)}/${id}`);
  revalidatePath(`/app/library/${collectionPath(type)}/${id}/edit`);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const input = (await request.json()) as CollectionItemInput;

  if (!isCollectionType(input.type)) {
    return NextResponse.json({ message: "Invalid collection type.", ok: false }, { status: 400 });
  }

  const title = cleanText(input.title);

  if (!title) {
    return NextResponse.json({ message: "Title is required.", ok: false }, { status: 400 });
  }

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("library_items")
    .update({
      body: cleanText(input.body),
      metadata: metadataFromInput(input),
      title,
    })
    .eq("id", id)
    .eq("type", input.type);

  if (error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 500 });
  }

  revalidateCollection(input.type, id);

  return NextResponse.json({ id, message: "Saved.", ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 500 });
  }

  revalidatePath("/app/library");
  revalidatePath("/app/library/duas");
  revalidatePath("/app/library/hadiths");
  revalidatePath("/app/library/khutbahs");

  return NextResponse.json({ message: "Library item removed.", ok: true });
}
