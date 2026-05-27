"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type MushafPage, type Surah } from "@/lib/quran/types";

type MushafTopBarProps = {
  page: MushafPage | undefined;
  surahs: Surah[];
  isVisible: boolean;
};

const juzStartPages = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302,
  322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];

function getJuzNumber(pageNumber: number) {
  let juz = 1;

  for (let index = 0; index < juzStartPages.length; index += 1) {
    if (pageNumber >= juzStartPages[index]) {
      juz = index + 1;
    }
  }

  return juz;
}

function getPageSurahName(page: MushafPage | undefined, surahs: Surah[]) {
  const firstSurahNumber = page?.surahNumbers[0];

  if (!firstSurahNumber) {
    return "Qur'an";
  }

  return (
    surahs.find((surah) => surah.number === firstSurahNumber)?.transliteratedName ??
    `Surah ${firstSurahNumber}`
  );
}

export function MushafTopBar({ isVisible, page, surahs }: MushafTopBarProps) {
  const pageNumber = page?.pageNumber ?? 1;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-paper/95 px-3 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] shadow-soft backdrop-blur transition-transform duration-200 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <Link
          aria-label="Back to surah selector"
          className="flex size-10 items-center justify-center rounded-xl border border-line bg-paper text-ink transition hover:bg-mist focus:outline-none focus:ring-2 focus:ring-palm/25"
          href="/app/quran"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold text-ink">
            {getPageSurahName(page, surahs)}
          </p>
          <p className="text-xs font-semibold text-ink/50">
            Juz {getJuzNumber(pageNumber)}
          </p>
        </div>
        <div className="size-10" aria-hidden />
      </div>
    </header>
  );
}
