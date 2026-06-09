"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  formatSimilarVerseDate,
  formatSimilarVerseItemReference,
  formatSimilarVerseRecordTitle,
} from "@/lib/similar-verses/format";
import {
  defaultSimilarVerseHighlightLayers,
  getSimilarVerseHighlightLayer,
} from "@/lib/similar-verses/highlight-layers";
import {
  type SimilarVerseDraftItem,
  type SimilarVerseRecord,
} from "@/lib/similar-verses/types";
import { cn } from "@/lib/utils";

type SimilarVersesCatalogProps = {
  records: SimilarVerseRecord[];
  versesByKey: Record<string, SimilarVerseDraftItem>;
};

export function SimilarVersesCatalog({ records, versesByKey }: SimilarVersesCatalogProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(() => new Set());

  function toggleRecord(recordId: string) {
    setExpandedRecords((current) => {
      const next = new Set(current);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  return (
    <div className="grid gap-3">
      {records.map((record) => {
        const isExpanded = expandedRecords.has(record.id);

        return (
          <article
            className="overflow-hidden rounded-[1.6rem] border border-line bg-paper shadow-soft transition hover:border-palm/25"
            key={record.id}
          >
            <div className="grid grid-cols-[1fr_auto] items-stretch">
              <Link className="min-w-0 p-4" href={`/app/library/similar-verses/${record.id}`}>
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-palm/10 text-palm">
                    <Sparkles aria-hidden className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-2 text-base font-extrabold text-ink">
                      {formatSimilarVerseRecordTitle(record)}
                    </h2>
                    {record.familyTitle ? (
                      <p
                        className="mt-1 line-clamp-1 text-right text-sm font-bold text-palm"
                        dir="rtl"
                        lang="ar"
                      >
                        {record.familyTitle}
                      </p>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">
                      {record.items.map(formatSimilarVerseItemReference).join(" · ")}
                    </p>
                    <CatalogCommentPreview note={record.note} />
                    <p className="mt-3 text-xs font-semibold text-ink/40">
                      {record.items.length} ayat · Updated {formatSimilarVerseDate(record.updatedAt)}
                    </p>
                  </div>
                </div>
              </Link>
              <button
                aria-label={isExpanded ? "Collapse" : "Expand"}
                className="flex w-12 items-center justify-center border-l border-line bg-mist/55 text-ink/45 transition hover:bg-palm/5 hover:text-palm"
                onClick={() => toggleRecord(record.id)}
                type="button"
              >
                <ChevronDown
                  aria-hidden
                  className={cn("size-5 transition-transform", isExpanded && "rotate-180")}
                />
              </button>
            </div>
            {isExpanded ? (
              <div className="border-t border-line px-4 pb-4 pt-3">
                <CatalogHighlightLegend record={record} />
                <div className="mt-3 grid gap-3">
                  {record.items.map((item) => {
                    const verse = versesByKey[item.verseKey];
                    const highlights = record.highlights.filter(
                      (highlight) => highlight.verseKey === item.verseKey,
                    );

                    return (
                      <div
                        className="rounded-[1.25rem] border border-line bg-palm/5 px-3 py-3"
                        key={item.id}
                      >
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-palm">
                          {formatSimilarVerseItemReference(item)}
                        </p>
                        {verse ? (
                          <div
                            className="overflow-hidden text-right text-xl leading-[2.65rem] text-ink"
                            dir="rtl"
                            lang="ar"
                          >
                            <CatalogWordBlocks
                              highlights={highlights}
                              verseKey={verse.verseKey}
                              words={verse.words}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function CatalogHighlightLegend({ record }: { record: SimilarVerseRecord }) {
  const usedHighlights = Array.from(
    new Map(record.highlights.map((highlight) => [highlight.type, highlight])).values(),
  );

  if (!usedHighlights.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {usedHighlights.map((highlight) => {
        const layer = getSimilarVerseHighlightLayer(
          defaultSimilarVerseHighlightLayers,
          highlight.type,
        );

        return (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-mist px-2.5 py-1 text-xs font-bold text-ink/60"
          key={highlight.type}
        >
          <span className="size-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
          {highlight.label ?? layer.name}
        </span>
        );
      })}
    </div>
  );
}

function CatalogWordBlocks({
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
                  backgroundColor: getSimilarVerseHighlightLayer(
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

function CatalogCommentPreview({ full, note }: { full?: boolean; note: string | null }) {
  const comments = parseComments(note ?? "");

  if (!comments.length) {
    return null;
  }

  const visibleComments = full ? comments : comments.slice(0, 2);

  return (
    <div className="mt-2 grid gap-1.5">
      {visibleComments.map((comment, index) => (
        <div
          className="flex min-w-0 items-start gap-2 text-sm leading-5 text-ink/55"
          key={`${comment}-${index}`}
        >
          <span className="mt-2 size-1 shrink-0 rounded-full bg-palm/70" />
          <p className={cn("min-w-0", !full && "line-clamp-1")}>{comment}</p>
        </div>
      ))}
      {!full && comments.length > 2 ? (
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
