import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function cleanText(value?: string | null) {
  const cleaned = value?.trim();

  return cleaned ? cleaned : null;
}

export async function POST(request: Request) {
  const input = (await request.json()) as {
    bullets?: string[];
    surahNumber?: number;
    title?: string | null;
  };
  const surahNumber = Number(input.surahNumber);
  const title = cleanText(input.title);
  const bullets = (input.bullets ?? []).map((bullet) => bullet.trim()).filter(Boolean);

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ message: "Invalid surah number.", ok: false }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ message: "Tag title is required.", ok: false }, { status: 400 });
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("library_items").insert({
    ayah_end: null,
    ayah_start: null,
    body: bullets.length ? bullets.map((bullet) => `- ${bullet}`).join("\n") : null,
    metadata: { bullets, kind: "surah_tag" },
    page_number: null,
    surah_number: surahNumber,
    title,
    type: "surah_note",
    user_id: user.id,
    verse_key: null,
  });

  if (error) {
    return NextResponse.json({ message: error.message, ok: false }, { status: 500 });
  }

  revalidatePath("/app/library");
  revalidatePath("/app/library/surah-notes");

  return NextResponse.json({ message: "Surah tag saved.", ok: true });
}
