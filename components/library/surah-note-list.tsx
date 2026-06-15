"use client";

import { ChevronDown, Search, Trash2 } from "lucide-react";
import { type ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { formatLibraryReference } from "@/lib/library/format";
import {
  getSurahNoteTagIdsFromMetadata,
  parseSimilarVerseNote,
} from "@/lib/library/surah-note-tags";
import { type LibraryItem } from "@/lib/library/types";
import { type Surah } from "@/lib/quran/types";
import { formatSimilarVerseItemReference } from "@/lib/similar-verses/format";
import {
  defaultSimilarVerseHighlightLayers,
  getSimilarVerseHighlightLayer,
} from "@/lib/similar-verses/highlight-layers";
import {
  type SimilarVerseDraftItem,
  type SimilarVerseRecord,
} from "@/lib/similar-verses/types";
import { cn } from "@/lib/utils";

type SurahNoteListProps = {
  ayahInsights: LibraryItem[];
  emptyState: ReactNode;
  items: LibraryItem[];
  similarRecords: SimilarVerseRecord[];
  surahs: Surah[];
  versesByKey: Record<string, SimilarVerseDraftItem>;
};

export function SurahNoteList({
  ayahInsights,
  emptyState,
  items,
  similarRecords,
  surahs,
  versesByKey,
}: SurahNoteListProps) {
  const [query, setQuery] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const surahsByNumber = useMemo(
    () => new Map(surahs.map((surah) => [surah.number, surah])),
    [surahs],
  );
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return localItems;
    }

    return localItems.filter((item) => {
      const surahName = item.surahNumber
        ? surahsByNumber.get(item.surahNumber)?.transliteratedName
        : undefined;

      return [formatLibraryReference(item, surahName), item.title]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [localItems, query, surahsByNumber]);

  function removeItem(itemId: string) {
    if (!window.confirm("Remove this surah tag?")) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/library/collections/${itemId}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (result.ok) {
        setLocalItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      } else {
        window.alert(result.message ?? "Could not remove this surah tag.");
      }
    });
  }

  function toggleTag(tagId: string) {
    setExpandedTags((current) => {
      const next = new Set(current);

      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }

      return next;
    });
  }

  if (!localItems.length) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search surah tags</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35"
        />
        <input
          className="h-12 w-full rounded-2xl border border-line bg-paper pl-11 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search surah tags"
          value={query}
        />
      </label>

      <div className="grid gap-3">
        {filteredItems.map((item) => {
          const surahName = item.surahNumber
            ? surahsByNumber.get(item.surahNumber)?.transliteratedName
            : undefined;
          const linkedInsights = ayahInsights.filter((insight) =>
            getSurahNoteTagIdsFromMetadata(insight).includes(item.id),
          );
          const linkedSimilarRecords = similarRecords.filter((record) =>
            parseSimilarVerseNote(record.note).surahNoteTagIds.includes(item.id),
          );
          const isExpanded = expandedTags.has(item.id);

          return (
            <article
              className="overflow-hidden rounded-[1.35rem] border border-line bg-paper shadow-soft"
              key={item.id}
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-stretch">
                <button
                  className="min-w-0 px-4 py-4 text-left"
                  onClick={() => toggleTag(item.id)}
                  type="button"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-palm">
                    {formatLibraryReference(item, surahName)}
                  </p>
                  <h2 className="mt-1 text-base font-extrabold text-ink">
                    {item.title || "Surah tag"}
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-ink/40">
                    {linkedInsights.length} insights · {linkedSimilarRecords.length} similar records
                  </p>
                </button>
                <button
                  aria-label="Remove surah tag"
                  className="flex w-11 items-center justify-center bg-paper text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
                <button
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                  className="flex w-12 items-center justify-center border-l border-line bg-mist/55 text-ink/45 transition hover:bg-palm/5 hover:text-palm"
                  onClick={() => toggleTag(item.id)}
                  type="button"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn("size-5 transition-transform", isExpanded && "rotate-180")}
                  />
                </button>
              </div>

              {isExpanded ? (
                <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
                  {linkedInsights.length ? (
                    <div className="grid gap-2">
                      {linkedInsights.map((insight) => {
                        const insightSurahName = insight.surahNumber
                          ? surahsByNumber.get(insight.surahNumber)?.transliteratedName
                          : undefined;

                        return (
                          <div className="rounded-2xl bg-palm/5 px-3 py-3" key={insight.id}>
                            <p className="text-xs font-bold uppercase tracking-wide text-palm">
                              {formatLibraryReference(insight, insightSurahName)}
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-ink">
                              {insight.title || "Ayah insight"}
                            </p>
                            {insight.body ? (
                              <p className="mt-2 text-sm leading-6 text-ink/65">
                                {insight.body}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {linkedSimilarRecords.map((record) => (
                    <SurahTagSimilarRecordPreview
                      key={record.id}
                      record={record}
                      versesByKey={versesByKey}
                    />
                  ))}

                  {!linkedInsights.length && !linkedSimilarRecords.length ? (
                    <div className="rounded-2xl border border-dashed border-line bg-mist/45 px-4 py-6 text-center text-sm font-semibold text-ink/45">
                      Nothing linked to this tag yet.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SurahTagSimilarRecordPreview({
  record,
  versesByKey,
}: {
  record: SimilarVerseRecord;
  versesByKey: Record<string, SimilarVerseDraftItem>;
}) {
  return (
    <div className="rounded-[1.25rem] border border-line bg-mist/40 p-3">
      <p className="text-sm font-extrabold text-ink">
        {record.title || "Similar verses record"}
      </p>
      <div className="mt-3 grid gap-3">
        {record.items.map((item) => {
          const verse = versesByKey[item.verseKey];
          const highlights = record.highlights.filter(
            (highlight) => highlight.verseKey === item.verseKey,
          );

          return (
            <div className="rounded-2xl bg-paper px-3 py-3" key={item.id}>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-palm">
                {formatSimilarVerseItemReference(item)}
              </p>
              {verse ? (
                <SimilarRecordWordBlocks
                  highlights={highlights}
                  verseKey={verse.verseKey}
                  words={verse.words}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimilarRecordWordBlocks({
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

    if (previous && previous.kind === kind && previous.highlight?.id === highlight?.id) {
      previous.words.push(word);
    } else {
      currentChunks.push({ highlight, kind, words: [word] });
    }

    return currentChunks;
  }, []);

  return (
    <div
      className="flex max-w-full flex-wrap justify-end gap-x-1 gap-y-2 overflow-hidden text-right text-xl leading-[2.65rem] text-ink"
      dir="rtl"
      lang="ar"
    >
      {chunks.map((chunk, index) => (
        <span
          className="inline-flex max-w-full flex-wrap justify-end rounded-xl px-1.5 py-1"
          key={`${verseKey}-${index}-${chunk.words[0]?.wordPosition}`}
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
