import Link from "next/link";
import { NotebookPen } from "lucide-react";
import { type Surah } from "@/lib/quran/types";

type SurahListItemProps = {
  surah: Surah;
  firstPage?: number;
  onOpen?: (surah: Surah, pageNumber?: number) => void;
};

export function SurahListItem({ firstPage, onOpen, surah }: SurahListItemProps) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-stretch gap-2 rounded-xl border border-line bg-paper px-3 py-2.5 shadow-soft transition hover:border-palm/30 hover:bg-white">
      <Link
        className="grid min-w-0 grid-cols-[2.25rem_1fr] items-center gap-3 focus:outline-none focus:ring-2 focus:ring-palm/25"
        href={firstPage ? `/app/mushaf/${firstPage}` : `/app/quran/${surah.number}`}
        onClick={() => onOpen?.(surah, firstPage)}
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-palm/10 text-sm font-bold text-palm">
          {surah.number}
        </span>
        <span className="min-w-0">
          <span className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">
                {surah.transliteratedName}
              </span>
              <span className="block truncate text-xs text-ink/60">{surah.englishName}</span>
            </span>
            <span
              className="shrink-0 text-lg font-semibold leading-none text-ink"
              dir="rtl"
              lang="ar"
            >
              {surah.arabicName}
            </span>
          </span>
          <span className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-ink/50">
            <span>{surah.ayahCount} ayat</span>
            {surah.revelationType ? <span>{surah.revelationType}</span> : null}
            {firstPage ? <span>Page {firstPage}</span> : null}
          </span>
        </span>
      </Link>
      <Link
        aria-label={`Add note for ${surah.transliteratedName}`}
        className="flex w-10 items-center justify-center rounded-xl text-ink/45 transition hover:bg-mist hover:text-palm focus:outline-none focus:ring-2 focus:ring-palm/25"
        href="/app/library/surah-notes"
      >
        <NotebookPen aria-hidden className="size-5" />
      </Link>
    </div>
  );
}
