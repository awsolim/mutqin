import { NextResponse } from "next/server";
import { getBookmarkMarkersForPages } from "@/lib/library/actions";
import { getSimilarVerseLinksForPages } from "@/lib/similar-verses/actions";

export const dynamic = "force-dynamic";

function parsePageNumbers(request: Request) {
  const url = new URL(request.url);
  const rawPages = url.searchParams.get("pages") ?? "";

  return Array.from(
    new Set(
      rawPages
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604),
    ),
  ).slice(0, 21);
}

export async function GET(request: Request) {
  const pageNumbers = parsePageNumbers(request);

  if (!pageNumbers.length) {
    return NextResponse.json(
      { bookmarksByPage: {}, similarLinksByPage: {} },
      { status: 400 },
    );
  }

  try {
    const [bookmarksByPage, similarLinksByPage] = await Promise.all([
      getBookmarkMarkersForPages(pageNumbers),
      getSimilarVerseLinksForPages(pageNumbers),
    ]);

    return NextResponse.json(
      { bookmarksByPage, similarLinksByPage },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { bookmarksByPage: {}, similarLinksByPage: {} },
      { status: 200 },
    );
  }
}
