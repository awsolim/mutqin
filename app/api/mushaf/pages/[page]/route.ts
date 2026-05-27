import { NextResponse } from "next/server";
import { getMushafPage } from "@/lib/quran/utils";

type MushafPageApiProps = {
  params: Promise<{
    page: string;
  }>;
};

export async function GET(_request: Request, { params }: MushafPageApiProps) {
  const { page } = await params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return NextResponse.json({ error: "Invalid mushaf page" }, { status: 404 });
  }

  const mushafPage = getMushafPage(pageNumber);

  if (!mushafPage) {
    return NextResponse.json({ error: "Mushaf page data missing" }, { status: 404 });
  }

  return NextResponse.json(mushafPage, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
