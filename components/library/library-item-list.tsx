"use client";

import { Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { deleteLibraryItem } from "@/lib/library/actions";
import { formatLibraryDate, formatLibraryReference } from "@/lib/library/format";
import { type LibraryItem } from "@/lib/library/types";
import { type Surah } from "@/lib/quran/types";

type DisplayLibraryItem = LibraryItem & {
  arabicPreview?: string | null;
};

type LibraryItemListProps = {
  emptyState: ReactNode;
  items: DisplayLibraryItem[];
  kind: "ayah_insight" | "bookmark";
  surahs: Surah[];
};

export function LibraryItemList({
  emptyState,
  items,
  kind,
  surahs,
}: LibraryItemListProps) {
  const [query, setQuery] = useState("");
  const [localItems, setLocalItems] = useState(items);
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
      const reference = formatLibraryReference(item, surahName).toLowerCase();

      return [reference, item.title, item.body, item.arabicPreview]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [localItems, query, surahsByNumber]);

  function removeItem(itemId: string) {
    if (!window.confirm("Remove this library item?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteLibraryItem(itemId);

      if (result.ok) {
        setLocalItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      }
    });
  }

  if (!localItems.length) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Search library items</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35"
        />
        <input
          className="h-12 w-full rounded-2xl border border-line bg-paper pl-11 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
          onChange={(event) => setQuery(event.target.value)}
          placeholder={kind === "bookmark" ? "Search bookmarks" : "Search ayah insights"}
          value={query}
        />
      </label>
      {filteredItems.length ? (
        <div className="grid gap-3">
          {filteredItems.map((item) => {
            const surahName = item.surahNumber
              ? surahsByNumber.get(item.surahNumber)?.transliteratedName
              : undefined;
            const reference = formatLibraryReference(item, surahName);
            const content = (
              <article className="rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft transition hover:border-palm/25">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-palm">
                      {reference}
                    </p>
                    <h2 className="mt-1 text-base font-extrabold text-ink">
                      {item.title || (kind === "bookmark" ? "Bookmarked ayah" : "Untitled insight")}
                    </h2>
                  </div>
                  <button
                    aria-label="Remove item"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    disabled={isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      removeItem(item.id);
                    }}
                    type="button"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
                {item.arabicPreview ? (
                  <p
                    className="mt-3 line-clamp-2 rounded-2xl bg-palm/5 px-3 py-2 text-right text-lg leading-8 text-ink"
                    dir="rtl"
                    lang="ar"
                  >
                    {item.arabicPreview}
                  </p>
                ) : null}
                {item.body ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink/65">
                    {item.body}
                  </p>
                ) : null}
                <p className="mt-3 text-xs font-semibold text-ink/40">
                  {formatLibraryDate(item.createdAt)}
                </p>
              </article>
            );

            return kind === "bookmark" && item.pageNumber ? (
              <Link href={`/app/mushaf/${item.pageNumber}?ayah=${item.verseKey}`} key={item.id}>
                {content}
              </Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-paper px-4 py-8 text-center text-sm font-semibold text-ink/55">
          No matches found.
        </div>
      )}
    </div>
  );
}
