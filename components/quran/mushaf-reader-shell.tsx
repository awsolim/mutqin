"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AudioPlaybackDock } from "@/components/audio/audio-playback-dock";
import { AyahActionBar } from "@/components/quran/ayah-action-bar";
import { MushafPageReader } from "@/components/quran/mushaf-page-reader";
import { MushafTopBar } from "@/components/quran/mushaf-top-bar";
import { compareVerseKeys, parseVerseKey } from "@/lib/audio/audio-utils";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";
import { getQcfV2FontName, getQcfV2FontUrl } from "@/lib/quran/font";
import { getVerseWordsFromPage, getWordSelection } from "@/lib/quran/page-utils";
import { type MushafPage, type SelectedAyah, type Surah } from "@/lib/quran/types";
import { cn } from "@/lib/utils";

type MushafReaderShellProps = {
  initialPage: MushafPage;
  initialVerseKey?: string;
  surahs: Surah[];
};

const cacheRadius = 3;
const swipeThreshold = 52;

type VerseRange = {
  start: SelectedAyah;
  end: SelectedAyah | null;
};

function getSelectionForVerseKey(page: MushafPage, verseKey?: string) {
  if (!verseKey) {
    return null;
  }

  const word = getVerseWordsFromPage(page, verseKey)[0];

  return word ? getWordSelection(word, page) : null;
}

export function MushafReaderShell({
  initialPage,
  initialVerseKey,
  surahs,
}: MushafReaderShellProps) {
  const audio = useAudioPlayer();
  const [currentPageNumber, setCurrentPageNumber] = useState(initialPage.pageNumber);
  const [pages, setPages] = useState<Record<number, MushafPage>>({
    [initialPage.pageNumber]: initialPage,
  });
  const [selectedAyah, setSelectedAyah] = useState<SelectedAyah | null>(() =>
    getSelectionForVerseKey(initialPage, initialVerseKey),
  );
  const [dragPercent, setDragPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedRange, setSelectedRange] = useState<VerseRange | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef(false);
  const suppressToggleUntil = useRef(0);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    window.scrollTo(0, 0);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.width = originalBodyWidth;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const cachePage = useCallback((page: MushafPage) => {
    setPages((currentPages) => {
      if (currentPages[page.pageNumber]) {
        return currentPages;
      }

      return { ...currentPages, [page.pageNumber]: page };
    });
  }, []);

  const loadPage = useCallback(
    async (pageNumber: number) => {
      if (pageNumber < 1 || pageNumber > 604 || pages[pageNumber]) {
        return;
      }

      const response = await fetch(`/api/mushaf/pages/${pageNumber}`, {
        cache: "force-cache",
      });

      if (!response.ok) {
        return;
      }

      cachePage((await response.json()) as MushafPage);
    },
    [cachePage, pages],
  );

  const warmFont = useCallback(async (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > 604 || !("FontFace" in window)) {
      return;
    }

    const fontName = getQcfV2FontName(pageNumber);

    if (Array.from(document.fonts).some((font) => font.family === fontName)) {
      return;
    }

    try {
      const fontFace = new FontFace(
        fontName,
        `url('${getQcfV2FontUrl(pageNumber)}') format('woff2')`,
      );
      fontFace.display = "block";
      await fontFace.load();
      document.fonts.add(fontFace);
    } catch {
      // The generated page still has Unicode fallback fields if a font cannot load.
    }
  }, []);

  const settleToPage = useCallback(
    (pageNumber: number, direction: 1 | -1) => {
      if (pageNumber < 1 || pageNumber > 604 || pageNumber === currentPageNumber) {
        setIsDragging(false);
        setIsSettling(false);
        setDragPercent(0);
        return;
      }

      setIsDragging(false);
      setIsSettling(true);
      setDragPercent(direction * 100);

      window.setTimeout(() => {
        setCurrentPageNumber(pageNumber);
        window.history.pushState(null, "", `/app/mushaf/${pageNumber}`);
        void loadPage(pageNumber);
        void warmFont(pageNumber);
        setIsDragging(true);
        setIsSettling(false);
        setDragPercent(0);
        window.requestAnimationFrame(() => setIsDragging(false));
      }, 260);
    },
    [currentPageNumber, loadPage, warmFont],
  );

  const getSurahName = useCallback(
    (surahNumber: number) =>
      surahs.find((surah) => surah.number === surahNumber)?.transliteratedName ??
      `Surah ${surahNumber}`,
    [surahs],
  );

  const formatSelectionLabel = useCallback(
    (selection: SelectedAyah) =>
      `${getSurahName(selection.surahNumber)} ${selection.verseKey}`,
    [getSurahName],
  );

  const getRangeVerseKeys = useCallback(
    (range: VerseRange | null, page: MushafPage | undefined) => {
      if (!range?.end || !page) {
        return [];
      }

      const [from, to] =
        compareVerseKeys(range.start.verseKey, range.end.verseKey) <= 0
          ? [range.start.verseKey, range.end.verseKey]
          : [range.end.verseKey, range.start.verseKey];

      return page.verseKeys.filter(
        (verseKey) =>
          compareVerseKeys(verseKey, from) >= 0 && compareVerseKeys(verseKey, to) <= 0,
      );
    },
    [],
  );

  const toggleChrome = useCallback(() => {
    if (Date.now() < suppressToggleUntil.current) {
      return;
    }

    setIsChromeVisible((isVisible) => {
      if (isVisible) {
        setSelectedAyah(null);
        setSelectedRange(null);
        setIsRangeMode(false);
      }

      return !isVisible;
    });
  }, []);

  const selectAyah = useCallback(
    (selection: SelectedAyah) => {
      setSelectedAyah(selection);
      setIsChromeVisible(true);
      setSelectedRange((currentRange) => {
        if (!isRangeMode) {
          return null;
        }

        if (!currentRange || currentRange.end) {
          return { start: selection, end: null };
        }

        setIsRangeMode(false);
        return { ...currentRange, end: selection };
      });
    },
    [isRangeMode],
  );

  useEffect(() => {
    const pagesToWarm = Array.from(
      { length: cacheRadius * 2 + 1 },
      (_, index) => currentPageNumber - cacheRadius + index,
    ).filter((pageNumber) => pageNumber >= 1 && pageNumber <= 604);

    for (const pageNumber of pagesToWarm) {
      void loadPage(pageNumber);
      void warmFont(pageNumber);
    }
  }, [currentPageNumber, loadPage, warmFont]);

  useEffect(() => {
    function handlePopState() {
      const match = window.location.pathname.match(/\/app\/mushaf\/(\d+)/);
      const pageNumber = match ? Number(match[1]) : initialPage.pageNumber;

      if (Number.isInteger(pageNumber) && pageNumber >= 1 && pageNumber <= 604) {
        setSelectedAyah(null);
        setSelectedRange(null);
        setIsRangeMode(false);
        setCurrentPageNumber(pageNumber);
        void loadPage(pageNumber);
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialPage.pageNumber, loadPage]);

  useEffect(() => {
    setSelectedRange(null);
    setIsRangeMode(false);
  }, [currentPageNumber]);

  const visiblePages = useMemo(
    () => [
      { pageNumber: currentPageNumber + 1, position: -1 },
      { pageNumber: currentPageNumber, position: 0 },
      { pageNumber: currentPageNumber - 1, position: 1 },
    ],
    [currentPageNumber],
  );

  const currentPage = pages[currentPageNumber];
  const currentRangeVerseKeys = useMemo(
    () => getRangeVerseKeys(selectedRange, currentPage),
    [currentPage, getRangeVerseKeys, selectedRange],
  );
  const rangeLabel = useMemo(() => {
    if (!selectedRange) {
      return null;
    }

    if (!selectedRange.end) {
      return `Range start: ${formatSelectionLabel(selectedRange.start)}`;
    }

    return `${formatSelectionLabel(selectedRange.start)} - ${selectedRange.end.verseKey}`;
  }, [formatSelectionLabel, selectedRange]);

  const rangeOptions = useMemo(() => {
    if (!selectedAyah) {
      return [];
    }

    const surah = surahs.find((currentSurah) => currentSurah.number === selectedAyah.surahNumber);

    if (!surah) {
      return [];
    }

    return Array.from(
      { length: surah.ayahCount - selectedAyah.ayahNumber + 1 },
      (_, index) => {
        const ayahNumber = selectedAyah.ayahNumber + index;
        const verseKey = `${selectedAyah.surahNumber}:${ayahNumber}`;

        return {
          verseKey,
          label: `${getSurahName(selectedAyah.surahNumber)} ${verseKey}`,
        };
      },
    );
  }, [getSurahName, selectedAyah, surahs]);

  const playbackRangeVerseKeys = useMemo(() => {
    if (!selectedRange?.end) {
      return [];
    }

    const [from, to] =
      compareVerseKeys(selectedRange.start.verseKey, selectedRange.end.verseKey) <= 0
        ? [selectedRange.start, selectedRange.end]
        : [selectedRange.end, selectedRange.start];

    if (from.surahNumber !== to.surahNumber) {
      return [];
    }

    return Array.from(
      { length: to.ayahNumber - from.ayahNumber + 1 },
      (_, index) => `${from.surahNumber}:${from.ayahNumber + index}`,
    );
  }, [selectedRange]);

  const playbackQueue = useMemo(
    () =>
      playbackRangeVerseKeys.map((verseKey) => ({
        verseKey,
        label: `Ayah ${verseKey}`,
      })),
    [playbackRangeVerseKeys],
  );

  const playRange = useCallback(() => {
    if (playbackQueue.length === 0) {
      return;
    }

    audio.playQueue(playbackQueue, { rangeRepeatCount: audio.rangeRepeatCount });
  }, [audio, playbackQueue]);

  const setRangeEnd = useCallback(
    (verseKey: string) => {
      if (!selectedAyah || !currentPage) {
        return;
      }

      if (verseKey === selectedAyah.verseKey) {
        setSelectedRange(null);
        setIsRangeMode(false);
        return;
      }

      const endWord = currentPage?.lines
        .flatMap((line) => line.words)
        .find((word) => word.verseKey === verseKey);

      const parsedVerse = parseVerseKey(verseKey);

      setSelectedRange({
        start: selectedAyah,
        end: endWord
          ? getWordSelection(endWord, currentPage)
          : {
              verseKey,
              surahNumber: parsedVerse.surahNumber,
              ayahNumber: parsedVerse.ayahNumber,
              pageNumber: currentPageNumber,
              text: "",
            },
      });
      setIsRangeMode(false);
    },
    [currentPage, currentPageNumber, selectedAyah],
  );

  return (
    <div className="fixed inset-0 h-[100svh] w-screen overflow-hidden bg-paper overscroll-none">
      <MushafTopBar
        isVisible={isChromeVisible}
        page={pages[currentPageNumber]}
        surahs={surahs}
      />
      <section
        className="mx-auto h-[100svh] min-h-[430px] max-h-[900px] w-full max-w-3xl overflow-hidden overscroll-none bg-paper pb-[5.25rem] pt-[5rem] touch-none"
        onTouchEnd={(event) => {
          if (touchStartX.current === null) {
            return;
          }

          const deltaX = event.changedTouches[0].clientX - touchStartX.current;
          const deltaY =
            touchStartY.current === null
              ? 0
              : event.changedTouches[0].clientY - touchStartY.current;
          touchStartX.current = null;
          touchStartY.current = null;

          if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaY) > Math.abs(deltaX)) {
            setIsDragging(false);
            setDragPercent(0);
            window.setTimeout(() => {
              touchMoved.current = false;
            }, 80);
            return;
          }

          suppressToggleUntil.current = Date.now() + 450;

          if (deltaX > 0) {
            settleToPage(currentPageNumber + 1, 1);
          } else {
            settleToPage(currentPageNumber - 1, -1);
          }
        }}
        onTouchMove={(event) => {
          event.preventDefault();

          if (touchStartX.current === null) {
            return;
          }

          const deltaX = event.touches[0].clientX - touchStartX.current;
          const deltaY =
            touchStartY.current === null ? 0 : event.touches[0].clientY - touchStartY.current;

          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            setDragPercent(0);
            return;
          }

          if (Math.abs(deltaX) > 8) {
            touchMoved.current = true;
            suppressToggleUntil.current = Date.now() + 350;
          }

          setDragPercent((deltaX / event.currentTarget.clientWidth) * 100);
        }}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0].clientX;
          touchStartY.current = event.touches[0].clientY;
          touchMoved.current = false;
          setIsDragging(true);
        }}
        onWheel={(event) => event.preventDefault()}
      >
        <div className="relative h-full overflow-hidden">
          {visiblePages.map(({ pageNumber, position }) => {
            const page = pages[pageNumber];

            return (
              <div
                className={cn(
                  "absolute inset-0 h-full w-full",
                  (!isDragging || isSettling) &&
                    "transition-transform duration-[260ms] ease-out",
                )}
                key={`${pageNumber}-${position}`}
                style={{
                  transform: `translateX(${position * 100 + dragPercent}%)`,
                }}
              >
                {page ? (
                  <MushafPageReader
                    activeVerseKey={
                      audio.currentVerseKey && page.verseKeys.includes(audio.currentVerseKey)
                        ? audio.currentVerseKey
                        : null
                    }
                    isRangeMode={isRangeMode}
                    onToggleChrome={toggleChrome}
                    onSelectAyah={selectAyah}
                    page={page}
                    rangeVerseKeys={
                      page.pageNumber === currentPageNumber ? currentRangeVerseKeys : []
                    }
                    selectedVerseKey={
                      isChromeVisible && selectedAyah?.pageNumber === page.pageNumber
                        ? selectedAyah.verseKey
                        : null
                    }
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-paper text-sm font-semibold text-ink/45">
                    Page {pageNumber}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-2 z-30 text-center text-xs font-semibold text-ink/45"
      >
        {currentPageNumber}
      </div>
      <AyahActionBar
        canPlayRange={playbackQueue.length > 0}
        isVisible={isChromeVisible}
        onClose={() => {
          setSelectedAyah(null);
          setSelectedRange(null);
          setIsRangeMode(false);
          setIsChromeVisible(false);
        }}
        onPlayRange={playRange}
        onSetRangeEnd={setRangeEnd}
        onStartPlayback={() => {
          setSelectedAyah(null);
          setSelectedRange(null);
          setIsRangeMode(false);
          setIsChromeVisible(true);
          window.scrollTo(0, 0);
        }}
        onNotify={(message) => {
          setToastMessage(message);
          window.setTimeout(() => setToastMessage(""), 1800);
        }}
        rangeLabel={rangeLabel}
        rangeOptions={rangeOptions}
        selectedRangeEndVerseKey={selectedRange?.end?.verseKey ?? null}
        selectedAyah={selectedAyah}
      />
      <AudioPlaybackDock isVisible={isChromeVisible && !selectedAyah} />
      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 px-5">
          <p className="mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-full bg-palm px-4 py-2 text-center text-sm font-bold text-white shadow-soft">
            {toastMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
