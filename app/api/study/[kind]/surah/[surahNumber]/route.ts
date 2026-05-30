import { NextResponse } from "next/server";
import { getStudyContentForSurah } from "@/lib/study/get-study-content";
import { type StudyContentKind } from "@/lib/study/types";

const validKinds = new Set<StudyContentKind>(["meaning", "tafsir", "translation"]);

type RouteContext = {
  params: Promise<{
    kind: string;
    surahNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const kind = params.kind as StudyContentKind;
  const surahNumber = Number(params.surahNumber);

  if (
    !validKinds.has(kind) ||
    !Number.isInteger(surahNumber) ||
    surahNumber < 1 ||
    surahNumber > 114
  ) {
    return NextResponse.json({ entries: [] }, { status: 400 });
  }

  const entries = await getStudyContentForSurah(kind, surahNumber);

  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
