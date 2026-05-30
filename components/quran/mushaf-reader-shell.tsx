"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { AudioPlaybackDock } from "@/components/audio/audio-playback-dock";
import { AyahActionBar } from "@/components/quran/ayah-action-bar";
import { MushafPageReader } from "@/components/quran/mushaf-page-reader";
import { MushafTopBar } from "@/components/quran/mushaf-top-bar";
import { SimilarVersesDetail } from "@/components/similar-verses/similar-verses-detail";
import { compareVerseKeys, parseVerseKey } from "@/lib/audio/audio-utils";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";
import { getQcfV2FontName, getQcfV2FontUrl } from "@/lib/quran/font";
import { getVerseWordsFromPage, getWordSelection } from "@/lib/quran/page-utils";
import { type MushafPage, type SelectedAyah, type Surah } from "@/lib/quran/types";
import {
  type SimilarVerseDraftItem,
  type SimilarVersePageLink,
  type SimilarVerseRecord,
} from "@/lib/similar-verses/types";
import { cn } from "@/lib/utils";

type MushafReaderShellProps = {
  initialPage: MushafPage;
  initialVerseKey?: string;
  surahs: Surah[];
};

const cacheRadius = 3;
const swipeThreshold = 52;

type SimilarPreviewRecord = {
  record: SimilarVerseRecord;
  verses: SimilarVerseDraftItem[];
};

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
  const [similarLinksByPage, setSimilarLinksByPage] = useState<
    Record<number, SimilarVersePageLink[]>
  >({});
  const [bookmarksByPage, setBookmarksByPage] = useState<Record<number, string[]>>({});
  const [similarChooserLinks, setSimilarChooserLinks] = useState<
    SimilarVersePageLink[] | null
  >(null);
  const [similarPreviewRecords, setSimilarPreviewRecords] = useState<SimilarPreviewRecord[]>([]);
  const [isSimilarPreviewLoading, setIsSimilarPreviewLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchMoved = useRef(false);
  const suppressToggleUntil = useRef(0);
  const lockedViewportHeight = useRef<number | null>(null);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalViewportHeight = document.documentElement.style.getPropertyValue(
      "--mutqin-viewport-height",
    );
    const viewportHeight = window.innerHeight;
    lockedViewportHeight.current = viewportHeight;

    document.documentElement.style.setProperty(
      "--mutqin-viewport-height",
      `${viewportHeight}px`,
    );
    document.body.style.overflow = "hidden";
    document.body.style.width = "100%";
    document.body.style.height = `${viewportHeight}px`;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.height = `${viewportHeight}px`;
    window.scrollTo(0, 0);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
      if (originalViewportHeight) {
        document.documentElement.style.setProperty(
          "--mutqin-viewport-height",
          originalViewportHeight,
        );
      } else {
        document.documentElement.style.removeProperty("--mutqin-viewport-height");
      }
    };
  }, []);

  const restoreViewportPosition = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const lockedHeight = lockedViewportHeight.current ?? window.innerHeight;
    document.documentElement.style.setProperty(
      "--mutqin-viewport-height",
      `${lockedHeight}px`,
    );
    document.body.style.height = `${lockedHeight}px`;
    document.documentElement.style.height = `${lockedHeight}px`;

    for (const delay of [0, 40, 120, 260, 520]) {
      window.setTimeout(() => {
        window.scrollTo(0, 0);
      }, delay);
    }
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

  const loadSimilarLinks = useCallback(
    async (pageNumber: number) => {
      if (pageNumber < 1 || pageNumber > 604 || similarLinksByPage[pageNumber]) {
        return;
      }

      try {
        const response = await fetch(`/api/similar-verses/page/${pageNumber}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { links: SimilarVersePageLink[] };
        setSimilarLinksByPage((currentLinks) => ({
          ...currentLinks,
          [pageNumber]: payload.links ?? [],
        }));
      } catch {
        setSimilarLinksByPage((currentLinks) => ({
          ...currentLinks,
          [pageNumber]: [],
        }));
      }
    },
    [similarLinksByPage],
  );

  const loadBookmarkMarkers = useCallback(
    async (pageNumber: number) => {
      if (pageNumber < 1 || pageNumber > 604 || bookmarksByPage[pageNumber]) {
        return;
      }

      try {
        const response = await fetch(`/api/library/bookmarks/page/${pageNumber}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          markers: Array<{ verseKey: string }>;
        };
        setBookmarksByPage((currentMarkers) => ({
          ...currentMarkers,
          [pageNumber]: (payload.markers ?? []).map((marker) => marker.verseKey),
        }));
      } catch {
        setBookmarksByPage((currentMarkers) => ({
          ...currentMarkers,
          [pageNumber]: [],
        }));
      }
    },
    [bookmarksByPage],
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
        void loadSimilarLinks(pageNumber);
        void loadBookmarkMarkers(pageNumber);
        void warmFont(pageNumber);
        setIsDragging(true);
        setIsSettling(false);
        setDragPercent(0);
        window.requestAnimationFrame(() => setIsDragging(false));
      }, 260);
    },
    [currentPageNumber, loadBookmarkMarkers, loadPage, loadSimilarLinks, warmFont],
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
      void loadSimilarLinks(pageNumber);
      void loadBookmarkMarkers(pageNumber);
      void warmFont(pageNumber);
    }
  }, [currentPageNumber, loadBookmarkMarkers, loadPage, loadSimilarLinks, warmFont]);

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
        void loadSimilarLinks(pageNumber);
        void loadBookmarkMarkers(pageNumber);
      }
    }

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialPage.pageNumber, loadBookmarkMarkers, loadPage, loadSimilarLinks]);

  useEffect(() => {
    setSelectedRange(null);
    setIsRangeMode(false);
  }, [currentPageNumber]);

  useEffect(() => {
    const page = pages[currentPageNumber];
    const surahNumber = page?.surahNumbers[0];

    if (!surahNumber) {
      return;
    }

    try {
      const storageKey = "mutqin_recent_surahs";
      const rawValue = window.localStorage.getItem(storageKey);
      const currentRecents = rawValue
        ? (JSON.parse(rawValue) as Array<{
            pageNumber: number;
            surahNumber: number;
            updatedAt: number;
          }>)
        : [];
      const nextRecents = [
        { pageNumber: currentPageNumber, surahNumber, updatedAt: Date.now() },
        ...currentRecents.filter((recent) => recent.surahNumber !== surahNumber),
      ].slice(0, 8);

      window.localStorage.setItem(storageKey, JSON.stringify(nextRecents));
    } catch {
      // Recents are a local convenience only.
    }
  }, [currentPageNumber, pages]);

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

  const openSimilarLinks = useCallback((_: string, links: SimilarVersePageLink[]) => {
    setSimilarChooserLinks(links);
    setSimilarPreviewRecords([]);
    setIsSimilarPreviewLoading(true);
    setIsChromeVisible(true);
  }, []);

  useEffect(() => {
    if (!similarChooserLinks?.length) {
      setSimilarPreviewRecords([]);
      setIsSimilarPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const linksToLoad = similarChooserLinks;

    async function loadRecords() {
      setIsSimilarPreviewLoading(true);

      const records = await Promise.all(
        linksToLoad.map(async (link) => {
          try {
            const response = await fetch(`/api/similar-verses/record/${link.setId}`, {
              cache: "no-store",
            });

            if (!response.ok) {
              return null;
            }

            return (await response.json()) as SimilarPreviewRecord;
          } catch {
            return null;
          }
        }),
      );

      if (!cancelled) {
        setSimilarPreviewRecords(
          records.filter(
            (record): record is SimilarPreviewRecord => Boolean(record?.record),
          ),
        );
        setIsSimilarPreviewLoading(false);
      }
    }

    void loadRecords();

    return () => {
      cancelled = true;
    };
  }, [similarChooserLinks]);

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
    <div className="fixed inset-0 h-[var(--mutqin-viewport-height,100svh)] w-screen overflow-hidden bg-paper overscroll-none">
      <MushafTopBar
        isVisible={isChromeVisible}
        page={pages[currentPageNumber]}
        surahs={surahs}
      />
      <section
        className="mx-auto h-[var(--mutqin-viewport-height,100svh)] min-h-[430px] max-h-[900px] w-full max-w-3xl overflow-hidden overscroll-none bg-paper pb-[5.25rem] pt-[5rem] touch-none"
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
                    onOpenSimilarLinks={openSimilarLinks}
                    page={page}
                    rangeVerseKeys={
                      page.pageNumber === currentPageNumber ? currentRangeVerseKeys : []
                    }
                    selectedVerseKey={
                      isChromeVisible && selectedAyah?.pageNumber === page.pageNumber
                        ? selectedAyah.verseKey
                        : null
                    }
                    bookmarkedVerseKeys={bookmarksByPage[page.pageNumber] ?? []}
                    similarVerseLinksByVerseKey={groupSimilarLinksByVerseKey(
                      similarLinksByPage[page.pageNumber] ?? [],
                    )}
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
          restoreViewportPosition();
        }}
        onPlayRange={playRange}
        onSetRangeEnd={setRangeEnd}
        onStartPlayback={() => {
          setSelectedAyah(null);
          setSelectedRange(null);
          setIsRangeMode(false);
          setIsChromeVisible(true);
          restoreViewportPosition();
        }}
        onRestoreViewport={restoreViewportPosition}
        onNotify={(message) => {
          if (selectedAyah) {
            setBookmarksByPage((currentMarkers) => {
              const pageMarkers = new Set(currentMarkers[selectedAyah.pageNumber] ?? []);

              if (message.toLowerCase().includes("removed")) {
                pageMarkers.delete(selectedAyah.verseKey);
              } else if (message.toLowerCase().includes("bookmark")) {
                pageMarkers.add(selectedAyah.verseKey);
              }

              return {
                ...currentMarkers,
                [selectedAyah.pageNumber]: Array.from(pageMarkers),
              };
            });
          }
          setToastMessage(message);
          window.setTimeout(() => setToastMessage(""), 1800);
        }}
        rangeLabel={rangeLabel}
        rangeOptions={rangeOptions}
        selectedRangeEndVerseKey={selectedRange?.end?.verseKey ?? null}
        selectedAyah={selectedAyah}
      />
      <AudioPlaybackDock isVisible={isChromeVisible && !selectedAyah} />
      {similarChooserLinks ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/12 px-2"
          onClick={() => setSimilarChooserLinks(null)}
        >
          <div
            className="mx-auto h-[86svh] w-full max-w-xl overflow-hidden rounded-t-[2.2rem] border border-line bg-paper shadow-[0_-18px_60px_rgba(31,39,33,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line/70 px-5 pb-3 pt-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-palm">
                  Similar Verses
                </p>
                <p className="mt-1 text-lg font-extrabold text-ink">
                  Linked record{similarChooserLinks.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-4 pt-1">
                {similarChooserLinks[0] ? (
                  <Link
                    aria-label="Open full record"
                    className="text-palm"
                    href={`/app/library/similar-verses/${similarChooserLinks[0].setId}`}
                  >
                    <ExternalLink aria-hidden className="size-5" />
                  </Link>
                ) : null}
                <button
                  className="text-base font-extrabold text-palm"
                  onClick={() => setSimilarChooserLinks(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="h-[calc(86svh-5.25rem)] overflow-y-auto px-4 py-4">
              {isSimilarPreviewLoading ? (
                <div className="flex h-full items-center justify-center text-sm font-bold text-ink/45">
                  Loading record...
                </div>
              ) : similarPreviewRecords.length ? (
                <div className="grid gap-6">
                  {similarPreviewRecords.map((preview) => (
                    <SimilarVersesDetail
                      key={preview.record.id}
                      record={preview.record}
                      verses={preview.verses}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-line bg-mist p-4 text-sm font-semibold text-ink/55">
                  Unable to load this record preview.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
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

function groupSimilarLinksByVerseKey(links: SimilarVersePageLink[]) {
  return links.reduce<Record<string, SimilarVersePageLink[]>>((groupedLinks, link) => {
    groupedLinks[link.verseKey] = [...(groupedLinks[link.verseKey] ?? []), link];
    return groupedLinks;
  }, {});
}
