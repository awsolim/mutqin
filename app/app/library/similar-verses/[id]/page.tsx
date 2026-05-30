import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { SimilarVersesDetail } from "@/components/similar-verses/similar-verses-detail";
import { deleteSimilarVerseSet, getSimilarVerseRecord } from "@/lib/similar-verses/actions";
import { getAyahByVerseKey } from "@/lib/quran/utils";

type SimilarVerseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SimilarVerseDetailPage({
  params,
}: SimilarVerseDetailPageProps) {
  const { id } = await params;
  const record = await getSimilarVerseRecord(id);

  if (!record) {
    notFound();
  }

  const verses = record.items
    .map((item) => getAyahByVerseKey(item.verseKey))
    .filter((verse): verse is NonNullable<typeof verse> => Boolean(verse));

  async function deleteCurrentRecord() {
    "use server";

    await deleteSimilarVerseSet(id);
    redirect("/app/library/similar-verses");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-line bg-paper text-ink/70 shadow-soft"
          href="/app/library/similar-verses"
        >
          <ArrowLeft aria-hidden className="size-5" />
          <span className="sr-only">Back to similar verses</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-4 text-sm font-bold text-ink shadow-soft"
            href={`/app/library/similar-verses/${id}/edit`}
          >
            <Pencil aria-hidden className="size-4" />
            Edit
          </Link>
          <form action={deleteCurrentRecord}>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700"
              type="submit"
            >
              <Trash2 aria-hidden className="size-4" />
              Delete
            </button>
          </form>
        </div>
      </div>
      <SimilarVersesDetail record={record} verses={verses} />
    </div>
  );
}
