import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { type SimilarVerseDraftItem } from "@/lib/similar-verses/types";
import { type SimilarVerseRecord } from "@/lib/similar-verses/types";
import { formatSimilarVerseItemReference } from "@/lib/similar-verses/format";
import {
  defaultSimilarVerseHighlightLayers,
  getSimilarVerseHighlightLayer,
} from "@/lib/similar-verses/highlight-layers";

type SimilarVersesDetailProps = {
  record: SimilarVerseRecord;
  verses: SimilarVerseDraftItem[];
};

export function SimilarVersesDetail({ record, verses }: SimilarVersesDetailProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-wide text-palm">
          Mutashabihat record
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">
          {record.title || "Similar verses record"}
        </h1>
        {record.familyTitle ? (
          <p className="mt-2 w-fit rounded-full bg-palm/8 px-3 py-1.5 text-right text-lg font-bold text-palm" dir="rtl" lang="ar">
            {record.familyTitle}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {record.items.map((item) => (
            <span
              className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink/60"
              key={item.id}
            >
              {formatSimilarVerseItemReference(item)}
            </span>
          ))}
        </div>
        <CommentList note={record.note} />
      </section>

      <div className="grid gap-4">
        {verses.map((verse) => {
          const item = record.items.find((current) => current.verseKey === verse.verseKey);
          const highlights = record.highlights.filter(
            (highlight) => highlight.verseKey === verse.verseKey,
          );

          return (
            <article
              className="rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft"
              key={verse.verseKey}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-palm">
                    {formatSimilarVerseItemReference({
                      ayahNumber: verse.ayahNumber,
                      surahNumber: verse.surahNumber,
                      verseKey: verse.verseKey,
                    })}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink/45">
                    Page {verse.pageNumber}
                  </p>
                </div>
                {item?.pageNumber ? (
                  <Link
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-ink/55 transition hover:text-palm"
                    href={`/app/mushaf/${item.pageNumber}?ayah=${verse.verseKey}`}
                  >
                    <ExternalLink aria-hidden className="size-4" />
                    <span className="sr-only">Open in mushaf</span>
                  </Link>
                ) : null}
              </div>
              <div
                className="overflow-hidden rounded-3xl bg-palm/5 px-3 py-4 text-right text-[1.45rem] leading-[2.85rem] text-ink"
                dir="rtl"
                lang="ar"
              >
                <DetailWordBlocks
                  highlights={highlights}
                  verseKey={verse.verseKey}
                  words={verse.words}
                />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function CommentList({ note }: { note: string | null }) {
  const comments = parseComments(note ?? "");

  if (!comments.length) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-2">
      {comments.map((comment, index) => (
        <div
          className="flex items-start gap-2 rounded-2xl bg-palm/5 px-4 py-3 text-sm leading-6 text-ink/70"
          key={`${comment}-${index}`}
        >
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-palm" />
          <p>{comment}</p>
        </div>
      ))}
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

function DetailWordBlocks({
  highlights,
  verseKey,
  words,
}: {
  highlights: SimilarVerseRecord["highlights"];
  verseKey: string;
  words: SimilarVerseDraftItem["words"];
}) {
  const chunks = words.reduce<Array<{
    highlight?: SimilarVerseRecord["highlights"][number];
    kind: "plain" | "highlight";
    words: SimilarVerseDraftItem["words"];
  }>>((currentChunks, word) => {
    const highlight = highlights.find(
      (current) =>
        word.wordPosition >= current.startWordPosition &&
        word.wordPosition <= current.endWordPosition,
    );
    const kind = highlight ? "highlight" : "plain";
    const previous = currentChunks[currentChunks.length - 1];

    if (
      previous &&
      previous.kind === kind &&
      previous.highlight?.id === highlight?.id
    ) {
      previous.words.push(word);
    } else {
      currentChunks.push({ highlight, kind, words: [word] });
    }

    return currentChunks;
  }, []);

  return (
    <div className="flex max-w-full flex-wrap justify-end gap-x-1 gap-y-2 overflow-hidden">
      {chunks.map((chunk, index) => (
        <span
          className="inline-flex max-w-full flex-wrap justify-end rounded-xl px-1.5 py-1"
          style={
            chunk.highlight
              ? {
                  backgroundColor:
                    chunk.highlight.color ??
                    getSimilarVerseHighlightLayer(
                      defaultSimilarVerseHighlightLayers,
                      chunk.highlight.type,
                    ).color,
                }
              : undefined
          }
          key={`${verseKey}-${index}-${chunk.words[0]?.wordPosition}`}
        >
          {chunk.words.map((word) => (
            <span className="mx-0.5 inline-block" key={`${verseKey}-${word.wordPosition}`}>
              {word.text}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
