import { NextResponse } from "next/server";
import { getIrabEntries } from "@/lib/irab/get-irab-entry";

type RouteContext = {
  params: Promise<{
    surahNumber: string;
    ayahNumber: string;
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
    ayahNumber < 1
  ) {
    return NextResponse.json({ entry: null }, { status: 400 });
  }

  const entries = await getIrabEntries(`${surahNumber}:${ayahNumber}`);

  return NextResponse.json(
    { entry: entries[0] ?? null, entries },
    {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
