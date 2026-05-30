import { NextResponse } from "next/server";
import { getSimilarVerseLinksForPage } from "@/lib/similar-verses/actions";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    pageNumber: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { pageNumber: pageParam } = await context.params;
  const pageNumber = Number(pageParam);

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return NextResponse.json({ links: [] }, { status: 400 });
  }

  try {
    const links = await getSimilarVerseLinksForPage(pageNumber);

    return NextResponse.json(
      { links },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch {
    return NextResponse.json({ links: [] }, { status: 200 });
  }
}
