import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { LibraryEmptyState } from "@/components/library/library-empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getSimilarVerseRecords } from "@/lib/similar-verses/actions";
import {
  formatSimilarVerseDate,
  formatSimilarVerseItemReference,
  formatSimilarVerseRecordTitle,
} from "@/lib/similar-verses/format";

export default async function SimilarVersesPage() {
  const records = await getSimilarVerseRecords();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          eyebrow="Qur'an Notes"
          title="Similar Verses Catalog"
        />
        <ButtonLink className="mt-5 h-10 min-h-10 shrink-0 rounded-2xl px-3" href="/app/library/similar-verses/new">
          <Plus aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">New</span>
        </ButtonLink>
      </div>

      {records.length ? (
        <div className="grid gap-3">
          {records.map((record) => (
            <Link href={`/app/library/similar-verses/${record.id}`} key={record.id}>
              <article className="rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft transition hover:border-palm/25">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-palm/10 text-palm">
                    <Sparkles aria-hidden className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-extrabold text-ink">
                      {formatSimilarVerseRecordTitle(record)}
                    </h2>
                    {record.familyTitle ? (
                      <p className="mt-1 line-clamp-1 text-right text-sm font-bold text-palm" dir="rtl" lang="ar">
                        {record.familyTitle}
                      </p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">
                      {record.items.map(formatSimilarVerseItemReference).join(" · ")}
                    </p>
                    <CatalogCommentPreview note={record.note} />
                    <p className="mt-3 text-xs font-semibold text-ink/40">
                      {record.items.length} āyāt · Updated {formatSimilarVerseDate(record.updatedAt)}
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <LibraryEmptyState
            description="Create a record, attach the ayat you mix up, then color the shared wording and the key differences."
            icon={Sparkles}
            title="No saved records yet"
          />
        </div>
      )}
    </div>
  );
}

function CatalogCommentPreview({ note }: { note: string | null }) {
  const comments = parseComments(note ?? "");

  if (!comments.length) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-1.5">
      {comments.slice(0, 2).map((comment, index) => (
        <div className="flex min-w-0 items-start gap-2 text-sm leading-5 text-ink/55" key={`${comment}-${index}`}>
          <span className="mt-2 size-1 shrink-0 rounded-full bg-palm/70" />
          <p className="line-clamp-1 min-w-0">{comment}</p>
        </div>
      ))}
      {comments.length > 2 ? (
        <p className="pl-3 text-xs font-semibold text-ink/35">
          +{comments.length - 2} more
        </p>
      ) : null}
    </div>
  );
}

function parseComments(value: string) {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as { comments?: string[]; kind?: string };

    if (parsed.kind === "mutqin-comments-v1" && Array.isArray(parsed.comments)) {
      return parsed.comments.filter((comment) => comment.trim());
    }
  } catch {
    // Older records used a plain text note.
  }

  return [value];
}
