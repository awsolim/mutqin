import { NextResponse } from "next/server";
import { getAyahByVerseKey } from "@/lib/quran/utils";
import { getSimilarVerseRecord } from "@/lib/similar-verses/actions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getSimilarVerseRecord(id);

  if (!record) {
    return NextResponse.json({ record: null, verses: [] }, { status: 404 });
  }

  const verses = record.items
    .map((item) => getAyahByVerseKey(item.verseKey))
    .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse));

  return NextResponse.json(
    { record, verses },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
