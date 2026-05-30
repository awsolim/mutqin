import { NextResponse } from "next/server";
import { getTranslationsForSurah } from "@/lib/translations/get-translations-for-verse";

type RouteContext = {
  params: Promise<{
    surahNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const surahNumber = Number(params.surahNumber);

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ entries: [] }, { status: 400 });
  }

  const entries = await getTranslationsForSurah(surahNumber);

  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
