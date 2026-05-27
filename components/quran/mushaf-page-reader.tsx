"use client";

import { useRef } from "react";
import { type MushafLine, type MushafPage, type MushafWord } from "@/lib/quran/types";
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
  onToggleChrome: () => void;
};

export function MushafPageReader({
  activeVerseKey,
  isRangeMode,
  onSelectAyah,
  onToggleChrome,
  page,
  rangeVerseKeys,
  selectedVerseKey,
}: MushafPageReaderProps) {
  const ayahLineCount = page.lines.filter((line) => line.lineType === "ayah").length;
  const isSparsePage = ayahLineCount <= 8;
  const rangeVerseKeySet = new Set(rangeVerseKeys);

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
          "mx-[-0.45rem] grid h-full max-w-[calc(100%+0.9rem)] overflow-hidden bg-paper px-0 py-0",
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
              onToggleChrome={onToggleChrome}
              page={page}
              rangeVerseKeySet={rangeVerseKeySet}
              selectedVerseKey={selectedVerseKey}
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
  onToggleChrome: () => void;
  page: MushafPage;
  rangeVerseKeySet: Set<string>;
  selectedVerseKey: string | null;
};

function MushafAyahLine({
  activeVerseKey,
  isRangeMode,
  isSparsePage,
  line,
  onSelectAyah,
  onToggleChrome,
  page,
  rangeVerseKeySet,
  selectedVerseKey,
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
            ? "text-[clamp(1.22rem,5.65vw,1.92rem)]"
            : "text-[clamp(1rem,4.75vw,1.56rem)]",
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
          onTap={() => {
            if (isRangeMode) {
              onSelectAyah(getWordSelection(word, page));
              return;
            }

            onToggleChrome();
          }}
          pageNumber={page.pageNumber}
          isInRange={rangeVerseKeySet.has(word.verseKey)}
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
              ? "text-[clamp(1.18rem,5.2vw,1.68rem)]"
              : "text-[clamp(1rem,4.45vw,1.38rem)]",
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
          ? "text-[clamp(1.1rem,4.75vw,1.52rem)]"
          : "text-[clamp(0.94rem,4.05vw,1.26rem)]",
      )}
    >
      {label}
    </div>
  );
}

type MushafWordSpanProps = {
  isActive: boolean;
  isInRange: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onTap: () => void;
  pageNumber: number;
  word: MushafWord;
};

function MushafWordSpan({
  isActive,
  isInRange,
  isSelected,
  onSelect,
  onTap,
  pageNumber,
  word,
}: MushafWordSpanProps) {
  const useGlyph = Boolean(word.codeV2);
  const text = word.codeV2 ?? word.textQpcHafs ?? word.text;
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

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
        isActive && "bg-[#f3e7bd]/45 text-[#8a6514]",
        isSelected && "bg-[#dbeadf]/50 text-palm",
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
    </span>
  );
}
