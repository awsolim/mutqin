"use client";

import { ChevronDown, Edit3, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTransition } from "react";
import { formatLibraryDate } from "@/lib/library/format";
import {
  type CollectionItemKind,
  type LibraryItem,
  type TextMarkerInput,
  type TextMarkerType,
} from "@/lib/library/types";
import { PageBackButton } from "@/components/page-back-button";
import { cn } from "@/lib/utils";
import {
  getBooleanMeta,
  getCollectionHref,
  getDuaEntries,
  getStringMeta,
  getTags,
  getTextMarkers,
} from "./collection-utils";

type CollectionDetailProps = {
  item: LibraryItem;
  type: CollectionItemKind;
};

const markerStyles: Record<TextMarkerType, string> = {
  sanad: "text-sm leading-8 text-ink/48",
  matn: "text-ink",
  quote: "text-palm font-extrabold",
};

const markerLabels: Record<TextMarkerType, string> = {
  sanad: "Sanad",
  matn: "Matn",
  quote: "Quote",
};

function splitArabicHadithText(text: string) {
  const quoteMatch = text.match(/[\"“”‏]*\s*[\"“”]\s*([^\"“”]+)\s*[\"“”]/);

  if (quoteMatch?.index !== undefined && quoteMatch[1]) {
    const quoteStart = quoteMatch.index + quoteMatch[0].indexOf(quoteMatch[1]);
    const quoteEnd = quoteStart + quoteMatch[1].length;

    return {
      afterQuote: text.slice(quoteEnd).replace(/^[\s\"“”‏.،]+/, "").trim(),
      matn: quoteMatch[1].trim(),
      sanad: text.slice(0, quoteStart).replace(/[\s\"“”‏]+$/, "").trim(),
    };
  }

  return { afterQuote: "", matn: text.trim(), sanad: "" };
}

function splitWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function getMarkerForWord(markers: TextMarkerInput[], wordPosition: number) {
  return markers.find(
    (marker) =>
      wordPosition >= marker.startWordPosition && wordPosition <= marker.endWordPosition,
  );
}

function MarkedText({
  dir = "ltr",
  markers,
  text,
}: {
  dir?: "ltr" | "rtl";
  markers: TextMarkerInput[];
  text: string;
}) {
  const words = splitWords(text);

  if (!markers.length) {
    return (
      <span>
        {text}
      </span>
    );
  }

  return words.map((word, index) => {
    const marker = getMarkerForWord(markers, index + 1);

    return (
      <span
        className={cn("mx-0.5 inline", marker && markerStyles[marker.type])}
        dir={dir}
        key={`${word}-${index}`}
      >
        {word}{" "}
      </span>
    );
  });
}

function renderMatnWithQuote(matn: string, quote: string) {
  if (!quote || !matn.includes(quote)) return matn;

  const [beforeQuote, rest] = matn.split(quote, 2);

  return (
    <>
      {beforeQuote}
      <span className="text-palm">{quote}</span>
      {rest}
    </>
  );
}

function HadithArabicText({
  markers = [],
  manualMatn,
  manualQuote,
  manualSanad,
  text,
}: {
  markers?: TextMarkerInput[];
  manualMatn?: string;
  manualQuote?: string;
  manualSanad?: string;
  text: string;
}) {
  if (markers.length) {
    return (
      <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
        <p
          className="text-right text-2xl font-semibold leading-[2.35] text-ink"
          dir="rtl"
          lang="ar"
        >
          <MarkedText dir="rtl" markers={markers} text={text} />
        </p>
        <MarkerLegend markers={markers} />
      </section>
    );
  }

  const fallback = splitArabicHadithText(text);
  const sanad = manualSanad?.trim() || fallback.sanad;
  const matn = manualMatn?.trim() || fallback.matn;
  const quote = manualQuote?.trim() || (fallback.sanad ? fallback.matn : "");
  const afterQuote = manualMatn ? "" : fallback.afterQuote;

  return (
    <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
      {sanad ? (
        <p
          className="mb-4 text-right text-sm font-semibold leading-8 text-ink/48"
          dir="rtl"
          lang="ar"
        >
          {sanad}
        </p>
      ) : null}
      <p
        className="text-right text-2xl font-semibold leading-[2.35] text-ink"
        dir="rtl"
        lang="ar"
      >
        {renderMatnWithQuote(matn, quote)}
      </p>
      {afterQuote ? (
        <p
          className="mt-3 text-right text-base font-semibold leading-8 text-ink/60"
          dir="rtl"
          lang="ar"
        >
          {afterQuote}
        </p>
      ) : null}
    </section>
  );
}

function MarkerLegend({ markers }: { markers: TextMarkerInput[] }) {
  const visibleTypes = Array.from(new Set(markers.map((marker) => marker.type)));

  if (!visibleTypes.length) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {visibleTypes.map((type) => (
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-extrabold",
            type === "sanad" && "bg-ink/10 text-ink/55",
            type === "matn" && "bg-sky-100 text-sky-700",
            type === "quote" && "bg-palm/10 text-palm",
          )}
          key={type}
        >
          {markerLabels[type]}
        </span>
      ))}
    </div>
  );
}

export function CollectionDetail({ item, type }: CollectionDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const baseHref = getCollectionHref(type);
  const metaRows = [
    ["Source", getStringMeta(item, "source")],
    ["Reference", getStringMeta(item, "reference")],
    ["Category", getStringMeta(item, "category")],
    ["Narrator", getStringMeta(item, "narrator")],
    ["Grade", getStringMeta(item, "grade")],
    ["Book", getStringMeta(item, "book")],
    ["Chapter", getStringMeta(item, "chapter")],
    ["Provider", getStringMeta(item, "provider")],
  ].filter(([, value]) => Boolean(value));
  const tags = getTags(item);
  const sourceUrl = getStringMeta(item, "sourceUrl");
  const arabicMarkers = getTextMarkers(item, "arabicMarkers");
  const translationMarkers = getTextMarkers(item, "translationMarkers");
  const duaEntries = getDuaEntries(item);

  function removeItem() {
    if (!window.confirm("Delete this item?")) return;

    startTransition(async () => {
      const response = await fetch(`/api/library/collections/${item.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (result.ok) {
        router.push(baseHref);
        router.refresh();
      } else {
        window.alert(result.message ?? "Could not delete this item.");
      }
    });
  }

  return (
    <article className="space-y-4">
      <PageBackButton href={baseHref} label={type === "dua" ? "Duas" : "Hadiths"} />
      <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {getBooleanMeta(item, "pinned") ? (
                <Star aria-hidden className="size-4 fill-gold text-gold" />
              ) : null}
              <h1 className="text-2xl font-extrabold text-ink">{item.title}</h1>
            </div>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
              {type === "dua" ? "Dua" : "Hadith"} · {formatLibraryDate(item.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              aria-label="Edit"
              className="flex size-10 items-center justify-center rounded-full bg-mist text-palm transition hover:bg-palm/10"
              href={`${baseHref}/${item.id}/edit`}
            >
              <Edit3 aria-hidden className="size-4" />
            </Link>
            <button
              aria-label="Delete"
              className="flex size-10 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              disabled={isPending}
              onClick={removeItem}
              type="button"
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {metaRows.length || tags.length || sourceUrl ? (
        <section className="overflow-hidden rounded-[1.6rem] border border-line bg-paper shadow-soft">
          <button
            aria-expanded={isInfoOpen}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            onClick={() => setIsInfoOpen((current) => !current)}
            type="button"
          >
            <span>
              <span className="block text-sm font-extrabold text-ink">
                {type === "hadith" ? "Hadith information" : "Details"}
              </span>
              <span className="mt-1 block text-xs font-semibold text-ink/45">
                {metaRows.find(([label]) => label === "Reference")?.[1] ??
                  metaRows.find(([label]) => label === "Source")?.[1] ??
                  "Reference and source"}
              </span>
            </span>
            <ChevronDown
              aria-hidden
              className={cn("size-5 shrink-0 text-ink/45 transition-transform", isInfoOpen && "rotate-180")}
            />
          </button>
          {isInfoOpen ? (
            <div className="border-t border-line px-5 py-4">
              <div className="grid gap-3">
                {metaRows.map(([label, value]) => (
                  <div className="flex items-start justify-between gap-4 border-b border-line/70 pb-2 last:border-0 last:pb-0" key={label}>
                    <span className="text-xs font-bold uppercase tracking-wide text-ink/40">
                      {label}
                    </span>
                    <span className="text-right text-sm font-bold text-ink">{value}</span>
                  </div>
                ))}
              </div>
              {tags.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span className="rounded-full bg-palm/10 px-3 py-1 text-xs font-bold text-palm" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {sourceUrl ? (
                <a
                  className="mt-4 inline-flex text-xs font-extrabold uppercase tracking-wide text-palm"
                  href={sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Provider source
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {type === "dua" && duaEntries.length ? (
        <section className="grid gap-3 rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
          {duaEntries.map((entry, index) => (
            <div
              className="border-b border-line/70 pb-4 last:border-0 last:pb-0"
              key={entry.id}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-palm">
                Section {index + 1}
              </p>
              <p
                className="text-right text-2xl font-semibold leading-[2.35] text-ink"
                dir="rtl"
                lang="ar"
              >
                {entry.arabicText}
              </p>
              {entry.translation ? (
                <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-ink/78">
                  {entry.translation}
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : getStringMeta(item, "arabicText") ? (
        type === "hadith" ? (
          <HadithArabicText
            markers={arabicMarkers}
            manualMatn={getStringMeta(item, "matnText")}
            manualQuote={getStringMeta(item, "quoteText")}
            manualSanad={getStringMeta(item, "sanadText")}
            text={getStringMeta(item, "arabicText")}
          />
        ) : (
          <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
            <p className="text-right text-2xl font-semibold leading-[2.35] text-ink" dir="rtl" lang="ar">
              {getStringMeta(item, "arabicText")}
            </p>
          </section>
        )
      ) : null}

      {!duaEntries.length && getStringMeta(item, "translation") ? (
        <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
          <p className="whitespace-pre-wrap text-base leading-8 text-ink/78">
            <MarkedText markers={translationMarkers} text={getStringMeta(item, "translation")} />
          </p>
          <MarkerLegend markers={translationMarkers} />
        </section>
      ) : null}

      {type === "hadith" && getStringMeta(item, "transliteration") ? (
        <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
          <p className="whitespace-pre-wrap text-sm italic leading-7 text-ink/65">
            {getStringMeta(item, "transliteration")}
          </p>
        </section>
      ) : null}

      {item.body ? (
        <section className="rounded-[1.6rem] border border-line bg-paper p-5 shadow-soft">
          <p className="whitespace-pre-wrap text-sm leading-7 text-ink/72">{item.body}</p>
        </section>
      ) : null}
    </article>
  );
}
