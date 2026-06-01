"use client";

import { Search, Trash2 } from "lucide-react";
import { type ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import { deleteLibraryItem } from "@/lib/library/actions";
import { formatLibraryDate, formatLibraryReference } from "@/lib/library/format";
import { type LibraryItem } from "@/lib/library/types";
import { type Surah } from "@/lib/quran/types";

type SurahNoteListProps = {
  emptyState: ReactNode;
  items: LibraryItem[];
  surahs: Surah[];
};

function getBullets(item: LibraryItem) {
  const metadataBullets = item.metadata?.bullets;

  if (Array.isArray(metadataBullets)) {
    return metadataBullets.filter((bullet): bullet is string => typeof bullet === "string");
  }

  return (item.body ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•]\s*/, "").trim())
    .filter(Boolean);
}

export function SurahNoteList({ emptyState, items, surahs }: SurahNoteListProps) {
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
      const reference = formatLibraryReference(item, surahName);
      const bullets = getBullets(item).join(" ");

      return [reference, item.title, bullets]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [localItems, query, surahsByNumber]);

  function removeItem(itemId: string) {
    if (!window.confirm("Remove this surah note?")) {
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
        <span className="sr-only">Search surah notes</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35"
        />
        <input
          className="h-12 w-full rounded-2xl border border-line bg-paper pl-11 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search surah notes"
          value={query}
        />
      </label>

      <div className="grid gap-3">
        {filteredItems.map((item) => {
          const surahName = item.surahNumber
            ? surahsByNumber.get(item.surahNumber)?.transliteratedName
            : undefined;
          const bullets = getBullets(item);

          return (
            <article
              className="rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-palm">
                    {formatLibraryReference(item, surahName)}
                  </p>
                  <h2 className="mt-1 text-base font-extrabold text-ink">
                    {item.title || "Surah notes"}
                  </h2>
                </div>
                <button
                  aria-label="Remove surah note"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  disabled={isPending}
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
              {bullets.length ? (
                <ul className="mt-4 space-y-2 text-sm leading-6 text-ink/70">
                  {bullets.map((bullet, index) => (
                    <li className="flex gap-2" key={`${item.id}-${index}`}>
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-palm/65" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-4 text-xs font-semibold text-ink/40">
                {formatLibraryDate(item.createdAt)}
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
