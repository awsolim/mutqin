"use client";

import { ChevronDown, ExternalLink, Feather, Plus, ScrollText, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteLibraryItem } from "@/lib/library/actions";
import { formatLibraryDate } from "@/lib/library/format";
import {
  type CollectionItemKind,
  type LibraryItem,
  type TextMarkerInput,
  type TextMarkerType,
} from "@/lib/library/types";
import { cn } from "@/lib/utils";
import { LibraryEmptyState } from "./library-empty-state";
import {
  getBooleanMeta,
  getCollectionHref,
  getStringMeta,
  getTags,
  getTextMarkers,
} from "./collection-utils";

type CollectionListProps = {
  items: LibraryItem[];
  type: CollectionItemKind;
};

export function CollectionList({ items, type }: CollectionListProps) {
  const baseHref = getCollectionHref(type);
  const EmptyIcon = type === "dua" ? Feather : ScrollText;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [localItems, setLocalItems] = useState(items);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const filters = useMemo(() => {
    const values = new Set<string>();

    localItems.forEach((item) => {
      const primary = type === "dua" ? getStringMeta(item, "category") : getStringMeta(item, "reference");
      if (primary) values.add(primary);
      getTags(item).forEach((tag) => values.add(tag));
    });

    return ["all", ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [localItems, type]);
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return localItems.filter((item) => {
      const values = [
        item.title,
        item.body,
        getStringMeta(item, "arabicText"),
        getStringMeta(item, "translation"),
        getStringMeta(item, "source"),
        getStringMeta(item, "reference"),
        getStringMeta(item, "category"),
        getStringMeta(item, "narrator"),
        getStringMeta(item, "grade"),
        getStringMeta(item, "book"),
        getStringMeta(item, "chapter"),
        getStringMeta(item, "provider"),
        ...getTags(item),
      ].filter((value): value is string => Boolean(value));
      const matchesQuery =
        !normalizedQuery || values.some((value) => value.toLowerCase().includes(normalizedQuery));
      const matchesFilter =
        filter === "all" ||
        getStringMeta(item, "category") === filter ||
        getStringMeta(item, "source") === filter ||
        getTags(item).includes(filter);

      return matchesQuery && matchesFilter;
    });
  }, [filter, localItems, query]);

  function removeItem(itemId: string) {
    if (!window.confirm("Delete this item?")) return;

    startTransition(async () => {
      const result = await deleteLibraryItem(itemId);
      if (result.ok) {
        setLocalItems((current) => current.filter((item) => item.id !== itemId));
      }
    });
  }

  function toggleExpandedItem(itemId: string) {
    setExpandedItems((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  if (!localItems.length) {
    return (
      <div className="space-y-4">
        <Link
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-palm text-sm font-extrabold text-paper shadow-soft"
          href={`${baseHref}/new`}
        >
          <Plus aria-hidden className="size-4" />
          Add {type === "dua" ? "Dua" : "Hadith"}
        </Link>
        <LibraryEmptyState
          description="Add entries manually and keep your references, benefits, and review notes together."
          icon={EmptyIcon}
          title={type === "dua" ? "No duas saved yet" : "No hadiths saved yet"}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="relative block min-w-0">
          <span className="sr-only">Search</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink/35"
          />
          <input
            className="h-12 w-full rounded-2xl border border-line bg-paper pl-11 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-ink/35 focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${type === "dua" ? "duas" : "hadiths"}`}
            value={query}
          />
        </label>
        <Link
          className="flex size-12 items-center justify-center rounded-2xl bg-palm text-paper shadow-soft"
          href={`${baseHref}/new`}
        >
          <Plus aria-hidden className="size-5" />
          <span className="sr-only">Add</span>
        </Link>
      </div>

      {filters.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((value) => (
            <button
              className={`h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${
                filter === value ? "bg-palm text-paper" : "bg-mist text-ink/60"
              }`}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === "all" ? "All" : value}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          type === "hadith" ? (
            <HadithCollectionCard
              baseHref={baseHref}
              isExpanded={expandedItems.has(item.id)}
              isPending={isPending}
              item={item}
              key={item.id}
              onRemove={removeItem}
              onToggle={() => toggleExpandedItem(item.id)}
            />
          ) : (
          <Link href={`${baseHref}/${item.id}`} key={item.id}>
            <article className="rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft transition hover:border-palm/25">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {getBooleanMeta(item, "pinned") ? (
                      <Star aria-hidden className="size-4 fill-gold text-gold" />
                    ) : null}
                    <h2 className="text-base font-extrabold leading-6 text-ink">
                      {item.title}
                    </h2>
                  </div>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
                    {[getStringMeta(item, "source"), getStringMeta(item, "reference")]
                      .filter(Boolean)
                      .join(" · ") || "Dua"}
                  </p>
                </div>
                <button
                  aria-label="Delete"
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
              {type === "dua" && getStringMeta(item, "arabicText") ? (
                <p
                  className="mt-3 line-clamp-2 rounded-2xl bg-palm/5 px-3 py-2 text-right text-lg leading-8 text-ink"
                  dir="rtl"
                  lang="ar"
                >
                  {getStringMeta(item, "arabicText")}
                </p>
              ) : null}
              {type === "dua" && getStringMeta(item, "translation") ? (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-ink/65">
                  {getStringMeta(item, "translation")}
                </p>
              ) : null}
              <p className="mt-3 text-xs font-semibold text-ink/40">
                {formatLibraryDate(item.createdAt)}
              </p>
            </article>
          </Link>
          )
        ))}
      </div>
    </div>
  );
}

function HadithCollectionCard({
  baseHref,
  isExpanded,
  isPending,
  item,
  onRemove,
  onToggle,
}: {
  baseHref: string;
  isExpanded: boolean;
  isPending: boolean;
  item: LibraryItem;
  onRemove(itemId: string): void;
  onToggle(): void;
}) {
  const arabicText = getStringMeta(item, "arabicText");
  const translation = getStringMeta(item, "translation");
  const arabicMarkers = getTextMarkers(item, "arabicMarkers");
  const translationMarkers = getTextMarkers(item, "translationMarkers");

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-line bg-paper shadow-soft transition hover:border-palm/25">
      <div className="flex items-start justify-between gap-3 p-4">
        <button className="min-w-0 flex-1 text-left" onClick={onToggle} type="button">
          <div className="flex items-center gap-2">
            {getBooleanMeta(item, "pinned") ? (
              <Star aria-hidden className="size-4 fill-gold text-gold" />
            ) : null}
            <h2 className="min-w-0 break-words text-base font-extrabold leading-6 text-ink">
              {item.title}
            </h2>
          </div>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
            {getStringMeta(item, "reference") || "Hadith"}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            aria-label={isExpanded ? "Collapse" : "Expand"}
            className="flex size-9 items-center justify-center rounded-full bg-mist text-ink/45"
            onClick={onToggle}
            type="button"
          >
            <ChevronDown
              aria-hidden
              className={cn("size-4 transition-transform", isExpanded && "rotate-180")}
            />
          </button>
          <button
            aria-label="Delete"
            className="flex size-9 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            disabled={isPending}
            onClick={() => onRemove(item.id)}
            type="button"
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      {isExpanded ? (
        <div className="border-t border-line px-4 pb-4 pt-3">
          {arabicText ? (
            <p
              className="max-w-full overflow-hidden break-words text-right text-xl font-semibold leading-[2.2] text-ink [overflow-wrap:anywhere]"
              dir="rtl"
              lang="ar"
            >
              <MarkedCompactText dir="rtl" markers={arabicMarkers} text={arabicText} />
            </p>
          ) : null}
          {translation ? (
            <p className="mt-3 max-w-full overflow-hidden break-words text-sm leading-7 text-ink/68 [overflow-wrap:anywhere]">
              <MarkedCompactText markers={translationMarkers} text={translation} />
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-ink/40">
              {formatLibraryDate(item.createdAt)}
            </p>
            <Link
              aria-label="Open hadith"
              className="flex size-9 items-center justify-center rounded-full bg-palm/10 text-palm transition hover:bg-palm/15"
              href={`${baseHref}/${item.id}`}
            >
              <ExternalLink aria-hidden className="size-4" />
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}

const compactMarkerStyles: Record<TextMarkerType, string> = {
  sanad: "text-xs leading-6 text-ink/45",
  matn: "text-ink",
  quote: "font-extrabold text-palm",
};

function compactSplitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function compactMarkerForWord(markers: TextMarkerInput[], wordPosition: number) {
  return markers.find(
    (marker) =>
      wordPosition >= marker.startWordPosition && wordPosition <= marker.endWordPosition,
  );
}

function MarkedCompactText({
  dir = "ltr",
  markers,
  text,
}: {
  dir?: "ltr" | "rtl";
  markers: TextMarkerInput[];
  text: string;
}) {
  if (!markers.length) return <>{text}</>;

  return compactSplitWords(text).map((word, index) => {
    const marker = compactMarkerForWord(markers, index + 1);

    return (
      <span
        className={cn("mx-0.5 inline break-words", marker && compactMarkerStyles[marker.type])}
        dir={dir}
        key={`${word}-${index}`}
      >
        {word}{" "}
      </span>
    );
  });
}
