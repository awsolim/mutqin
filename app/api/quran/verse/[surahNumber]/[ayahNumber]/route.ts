import { NextResponse } from "next/server";
import { getAyahByVerseKey, getSurahByNumber } from "@/lib/quran/utils";

type RouteContext = {
  params: Promise<{
    ayahNumber: string;
    surahNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { ayahNumber: ayahParam, surahNumber: surahParam } = await context.params;
  const surahNumber = Number(surahParam);
  const ayahNumber = Number(ayahParam);
  const surah = getSurahByNumber(surahNumber);

  if (
    !surah ||
    !Number.isInteger(ayahNumber) ||
    ayahNumber < 1 ||
    ayahNumber > surah.ayahCount
  ) {
    return NextResponse.json({ verse: null }, { status: 404 });
  }

  const verse = getAyahByVerseKey(`${surahNumber}:${ayahNumber}`);

  return NextResponse.json(
    { verse },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
