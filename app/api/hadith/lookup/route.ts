import { NextResponse } from "next/server";
import { parseHadithReference } from "@/lib/hadith/parse-reference";
import { createHadithApiProvider } from "@/lib/hadith/providers/hadithapi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const referenceText = searchParams.get("reference") ?? "";
  const providerId = (process.env.HADITH_PROVIDER ?? "hadithapi").toLowerCase();
  const reference = parseHadithReference(referenceText, providerId);

  if (!referenceText.trim()) {
    return NextResponse.json(
      { ok: false, message: "Type a hadith reference first." },
      { status: 400 },
    );
  }

  if (!reference) {
    return NextResponse.json(
      {
        ok: false,
        message: "Could not parse that reference. Try Bukhari 1 or Muslim 1907.",
      },
      { status: 400 },
    );
  }

  if (providerId !== "hadithapi") {
    return NextResponse.json(
      { ok: false, message: `Unsupported hadith provider: ${providerId}.` },
      { status: 400 },
    );
  }

  try {
    const provider = createHadithApiProvider();
    const hadith = await provider.lookup(reference);

    return NextResponse.json({
      correctedReference: reference.correctedReference,
      hadith,
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Hadith lookup failed.",
      },
      { status: 502 },
    );
  }
}
