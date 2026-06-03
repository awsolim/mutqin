"use client";

import { useRef } from "react";
import { type MushafLine, type MushafPage, type MushafWord } from "@/lib/quran/types";
import { type SimilarVersePageLink } from "@/lib/similar-verses/types";
import { getQcfV2FontName } from "@/lib/quran/font";
import { getWordSelection } from "@/lib/quran/page-utils";
import { cn } from "@/lib/utils";

type MushafPageReaderProps = {
  page: MushafPage;
  selectedVerseKey: string | null;
  activeVerseKey: string | null;
  rangeVerseKeys: string[];
  isRangeMode: boolean;
  onSelectAyah: (selection: ReturnType<typeof getWordSelection>) => void;
  onOpenSimilarLinks?: (verseKey: string, links: SimilarVersePageLink[]) => void;
  onToggleChrome: () => void;
  bookmarkedVerseKeys?: string[];
  similarVerseLinksByVerseKey?: Record<string, SimilarVersePageLink[]>;
};

export function MushafPageReader({
  activeVerseKey,
  isRangeMode,
  onSelectAyah,
  onOpenSimilarLinks,
  onToggleChrome,
  bookmarkedVerseKeys = [],
  page,
  rangeVerseKeys,
  selectedVerseKey,
  similarVerseLinksByVerseKey = {},
}: MushafPageReaderProps) {
  const ayahLineCount = page.lines.filter((line) => line.lineType === "ayah").length;
  const isSparsePage = ayahLineCount <= 8;
  const rangeVerseKeySet = new Set(rangeVerseKeys);
  const bookmarkedVerseKeySet = new Set(bookmarkedVerseKeys);

  return (
    <article
      className="h-full overflow-hidden bg-paper"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[data-mushaf-word='true']")) {
          return;
        }

        onToggleChrome();
      }}
    >
      <div
        className={cn(
          "mx-[-1.05rem] grid h-full max-w-[calc(100%+2.1rem)] overflow-hidden bg-paper px-0 py-0",
          isSparsePage
            ? "grid-rows-[1fr_repeat(15,minmax(0,1fr))_1fr]"
            : "grid-rows-[repeat(15,minmax(0,1fr))]",
        )}
        dir="rtl"
        lang="ar"
      >
        {isSparsePage ? <div aria-hidden /> : null}
        {Array.from({ length: 15 }, (_, index) => {
          const lineNumber = index + 1;
          const line = page.lines.find((currentLine) => currentLine.lineNumber === lineNumber);

          if (!line) {
            return <div aria-hidden key={`blank-${lineNumber}`} />;
          }

          if (line.lineType === "surah_name" || line.lineType === "basmallah") {
            return (
              <MushafDisplayLine
                isSparsePage={isSparsePage}
                key={`${line.lineType}-${line.lineNumber}-${line.surahNumber}`}
                label={line.label ?? ""}
                type={line.lineType}
              />
            );
          }

          return (
            <MushafAyahLine
              activeVerseKey={activeVerseKey}
              isRangeMode={isRangeMode}
              isSparsePage={isSparsePage}
              key={`${line.lineType}-${line.lineNumber}`}
              line={line}
              onSelectAyah={onSelectAyah}
              onOpenSimilarLinks={onOpenSimilarLinks}
              onToggleChrome={onToggleChrome}
              page={page}
              rangeVerseKeySet={rangeVerseKeySet}
              selectedVerseKey={selectedVerseKey}
              bookmarkedVerseKeySet={bookmarkedVerseKeySet}
              similarVerseLinksByVerseKey={similarVerseLinksByVerseKey}
            />
          );
        })}
        {isSparsePage ? <div aria-hidden /> : null}
      </div>
    </article>
  );
}

type MushafAyahLineProps = {
  activeVerseKey: string | null;
  isRangeMode: boolean;
  isSparsePage: boolean;
  line: MushafLine;
  onSelectAyah: (selection: ReturnType<typeof getWordSelection>) => void;
  onOpenSimilarLinks?: (verseKey: string, links: SimilarVersePageLink[]) => void;
  onToggleChrome: () => void;
  page: MushafPage;
  rangeVerseKeySet: Set<string>;
  selectedVerseKey: string | null;
  bookmarkedVerseKeySet: Set<string>;
  similarVerseLinksByVerseKey: Record<string, SimilarVersePageLink[]>;
};

function MushafAyahLine({
  activeVerseKey,
  isRangeMode,
  isSparsePage,
  line,
  onSelectAyah,
  onOpenSimilarLinks,
  onToggleChrome,
  page,
  rangeVerseKeySet,
  selectedVerseKey,
  bookmarkedVerseKeySet,
  similarVerseLinksByVerseKey,
}: MushafAyahLineProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function selectLineAyah() {
    const word = line.words[0];

    if (word) {
      onSelectAyah(getWordSelection(word, page));
    }
  }

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <div
      className={cn(
        cn(
          "relative flex min-w-0 items-center justify-center overflow-visible whitespace-nowrap text-center leading-none text-ink",
          isSparsePage
            ? "text-[clamp(1.42rem,6.45vw,2.2rem)]"
            : "text-[clamp(1.12rem,5.35vw,1.84rem)]",
        ),
        line.isCentered && "text-center",
      )}
      onPointerCancel={clearLongPress}
      onClick={(event) => {
        if (didLongPress.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-mushaf-word='true']")) {
          return;
        }

        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          selectLineAyah();
        }, 520);
      }}
      onPointerLeave={clearLongPress}
      onPointerUp={() => {
        clearLongPress();
        window.setTimeout(() => {
          didLongPress.current = false;
        }, 80);
      }}
    >
      {line.words.map((word) => (
        <MushafWordSpan
          isSelected={selectedVerseKey === word.verseKey}
          isActive={activeVerseKey === word.verseKey}
          key={word.id}
          onSelect={() => onSelectAyah(getWordSelection(word, page))}
          onOpenSimilarLinks={onOpenSimilarLinks}
          onTap={() => {
            if (isRangeMode) {
              onSelectAyah(getWordSelection(word, page));
              return;
            }

            onToggleChrome();
          }}
          pageNumber={page.pageNumber}
          isInRange={rangeVerseKeySet.has(word.verseKey)}
          isBookmarked={bookmarkedVerseKeySet.has(word.verseKey)}
          similarLinks={similarVerseLinksByVerseKey[word.verseKey] ?? []}
          word={word}
        />
      ))}
    </div>
  );
}

type MushafDisplayLineProps = {
  isSparsePage: boolean;
  label: string;
  type: "surah_name" | "basmallah";
};

function MushafDisplayLine({ isSparsePage, label, type }: MushafDisplayLineProps) {
  if (type === "surah_name") {
    return (
      <div className="flex items-center justify-center px-4 text-center">
        <div
          className={cn(
            "relative flex h-[72%] min-w-40 items-center justify-center rounded-full border border-palm/35 px-8 text-palm",
            "before:absolute before:right-full before:top-1/2 before:h-px before:w-10 before:bg-palm/25",
            "after:absolute after:left-full after:top-1/2 after:h-px after:w-10 after:bg-palm/25",
            isSparsePage
              ? "text-[clamp(1.28rem,5.8vw,1.82rem)]"
              : "text-[clamp(1.08rem,4.9vw,1.52rem)]",
          )}
        >
          <span className="font-bold">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center text-center font-semibold text-ink",
        isSparsePage
          ? "text-[clamp(1.18rem,5.3vw,1.68rem)]"
          : "text-[clamp(1rem,4.5vw,1.38rem)]",
      )}
    >
      {label}
    </div>
  );
}

type MushafWordSpanProps = {
  isActive: boolean;
  isInRange: boolean;
  isBookmarked: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onOpenSimilarLinks?: (verseKey: string, links: SimilarVersePageLink[]) => void;
  onTap: () => void;
  pageNumber: number;
  similarLinks: SimilarVersePageLink[];
  word: MushafWord;
};

function MushafWordSpan({
  isActive,
  isInRange,
  isBookmarked,
  isSelected,
  onSelect,
  onOpenSimilarLinks,
  onTap,
  pageNumber,
  similarLinks,
  word,
}: MushafWordSpanProps) {
  const useGlyph = Boolean(word.codeV2);
  const text = word.codeV2 ?? word.textQpcHafs ?? word.text;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const isEndMarker = word.charTypeName === "end";
  const hasSimilarLinks = word.charTypeName === "end" && similarLinks.length > 0;
  const hasBookmarkMarker = word.charTypeName === "end" && isBookmarked;

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <span
      className={cn(
        "relative z-10 cursor-pointer select-none rounded px-[0.03em] transition",
        useGlyph ? "mx-0" : "mx-[0.08em]",
        isInRange && "bg-sage/10 text-palm",
        isActive && "bg-palm/20 text-[#245d45] shadow-[0_0_0_0.08em_rgba(64,112,84,0.08)]",
        isSelected && "bg-[#dbeadf]/50 text-palm",
        isEndMarker &&
          "text-[#8b6228] drop-shadow-[0_0_0.16rem_rgba(139,98,40,0.22)]",
        hasBookmarkMarker &&
          "text-[#1d69a8] drop-shadow-[0_0_0.18rem_rgba(29,105,168,0.28)]",
        hasSimilarLinks &&
          "text-[#8c3494] drop-shadow-[0_0_0.2rem_rgba(140,52,148,0.3)]",
      )}
      data-ayah-number={word.ayahNumber}
      data-mushaf-word="true"
      data-line-number={word.lineNumber}
      data-page-number={word.pageNumber}
      data-surah-number={word.surahNumber}
      data-verse-key={word.verseKey}
      data-word-position={word.wordPosition}
      dir="rtl"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        didLongPress.current = false;
      }}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (hasSimilarLinks) {
            onOpenSimilarLinks?.(word.verseKey, similarLinks);
            return;
          }
          onSelect();
        }
      }}
      onPointerCancel={clearLongPress}
      onPointerDown={(event) => {
        event.stopPropagation();
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          onSelect();
        }, 520);
      }}
      onPointerLeave={clearLongPress}
      onPointerUp={(event) => {
        event.stopPropagation();
        clearLongPress();

        if (!didLongPress.current) {
          if (hasSimilarLinks) {
            onOpenSimilarLinks?.(word.verseKey, similarLinks);
            window.setTimeout(() => {
              didLongPress.current = false;
            }, 0);
            return;
          }

          onTap();
        }

        window.setTimeout(() => {
          didLongPress.current = false;
        }, 0);
      }}
      role="button"
      style={{
        ...(useGlyph ? { fontFamily: getQcfV2FontName(pageNumber) } : {}),
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
      tabIndex={0}
    >
      {text}
      {hasSimilarLinks ? <span className="sr-only">Open similar verses records</span> : null}
    </span>
  );
}
