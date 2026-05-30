import { NextResponse } from "next/server";
import { getVerseSummariesForSurah } from "@/lib/quran/utils";

type RouteContext = {
  params: Promise<{
    surahNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const surahNumber = Number(params.surahNumber);

  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return NextResponse.json({ verses: [] }, { status: 400 });
  }

  const verses = getVerseSummariesForSurah(surahNumber);

  return NextResponse.json(
    { verses },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
