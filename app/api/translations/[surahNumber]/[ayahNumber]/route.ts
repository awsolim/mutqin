import { NextResponse } from "next/server";
import { getTranslationsForVerse } from "@/lib/translations/get-translations-for-verse";

type RouteContext = {
  params: Promise<{
    ayahNumber: string;
    surahNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const surahNumber = Number(params.surahNumber);
  const ayahNumber = Number(params.ayahNumber);

  if (
    !Number.isInteger(surahNumber) ||
    !Number.isInteger(ayahNumber) ||
    surahNumber < 1 ||
    surahNumber > 114 ||
    ayahNumber < 1
  ) {
    return NextResponse.json({ entries: [] }, { status: 400 });
  }

  const entries = await getTranslationsForVerse(`${surahNumber}:${ayahNumber}`);

  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
