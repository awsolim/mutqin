"use client";

import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { compareVerseKeys } from "@/lib/audio/audio-utils";
import { type PageIndexEntry, type Surah } from "@/lib/quran/types";
import { SurahListItem } from "./surah-list-item";

type SurahListProps = {
  surahs: Surah[];
  firstPages?: Record<string, number>;
  pageIndex: PageIndexEntry[];
};

type JumpTarget =
  | {
      type: "page";
      pageNumber: number;
      href: string;
      label: string;
      description: string;
    }
  | {
      type: "verse";
      pageNumber: number;
      href: string;
      label: string;
      description: string;
    };

function findVersePage(pageIndex: PageIndexEntry[], verseKey: string) {
  return (
    pageIndex.find(
      (page) =>
        page.firstVerseKey &&
        page.lastVerseKey &&
        compareVerseKeys(verseKey, page.firstVerseKey) >= 0 &&
        compareVerseKeys(verseKey, page.lastVerseKey) <= 0,
    )?.pageNumber ?? null
  );
}

export function SurahList({ firstPages = {}, pageIndex, surahs }: SurahListProps) {
  const [query, setQuery] = useState("");
  const jumpTarget = useMemo<JumpTarget | null>(() => {
    const normalizedQuery = query.trim();
    const pageMatch = normalizedQuery.match(/^p\s*(\d{1,3})$/i);

    if (pageMatch) {
      const pageNumber = Number(pageMatch[1]);

      if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604) {
        return {
          type: "page",
          pageNumber,
          href: `/app/mushaf/${pageNumber}`,
          label: `Open page ${pageNumber}`,
          description: "Jump directly to this mushaf page.",
        };
      }
    }

    const verseMatch = normalizedQuery.match(/^(\d{1,3})\s*[:]\s*(\d{1,3})$/);

    if (verseMatch) {
      const surahNumber = Number(verseMatch[1]);
      const ayahNumber = Number(verseMatch[2]);
      const surah = surahs.find((currentSurah) => currentSurah.number === surahNumber);

      if (surah && ayahNumber >= 1 && ayahNumber <= surah.ayahCount) {
        const verseKey = `${surahNumber}:${ayahNumber}`;
        const pageNumber = findVersePage(pageIndex, verseKey);

        if (pageNumber) {
          return {
            type: "verse",
            pageNumber,
            href: `/app/mushaf/${pageNumber}?ayah=${encodeURIComponent(verseKey)}`,
            label: `${surah.transliteratedName} ${verseKey}`,
            description: `Open page ${pageNumber} with this ayah highlighted.`,
          };
        }
      }
    }

    return null;
  }, [pageIndex, query, surahs]);

  const filteredSurahs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return surahs;
    }

    return surahs.filter((surah) => {
      const searchableValues = [
        surah.number.toString(),
        surah.arabicName,
        surah.transliteratedName,
        surah.englishName,
        surah.revelationType,
      ].filter((value): value is string => Boolean(value));

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [query, surahs]);

  return (
    <section className="space-y-4">
      <div className="relative">
        <label className="sr-only" htmlFor="surah-search">
          Search surahs
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-sage"
        />
        <input
          aria-label="Search surahs"
          className="min-h-12 w-full rounded-2xl border border-line bg-paper py-3 pl-11 pr-4 text-base text-ink shadow-soft outline-none transition placeholder:text-ink/40 focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
          id="surah-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search surah, 2:255, or p20"
          type="search"
          value={query}
        />
      </div>

      {jumpTarget ? (
        <Link
          className="flex items-center gap-3 rounded-2xl border border-palm/20 bg-paper px-3 py-3 shadow-soft transition hover:border-palm/40 hover:bg-white focus:outline-none focus:ring-2 focus:ring-palm/25"
          href={jumpTarget.href}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-palm/10 text-palm">
            <FileText aria-hidden className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">{jumpTarget.label}</span>
            <span className="block text-xs font-semibold text-ink/55">
              {jumpTarget.description}
            </span>
          </span>
        </Link>
      ) : null}

      {filteredSurahs.length > 0 ? (
        <div className="grid gap-3">
          {filteredSurahs.map((surah) => (
            <SurahListItem
              firstPage={firstPages[String(surah.number)]}
              key={surah.number}
              surah={surah}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center shadow-soft">
          <p className="text-sm font-semibold text-ink">No surahs found</p>
          <p className="mt-1 text-sm text-ink/60">
            Try searching by surah number, Arabic name, or transliteration.
          </p>
        </div>
      )}
    </section>
  );
}
