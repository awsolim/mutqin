"use client";

import {
  Bookmark,
  BookMarked,
  BookOpenText,
  Headphones,
  Languages,
  Lightbulb,
  Play,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { type ReactNode, type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createAyahInsight,
  getBookmarkForVerse,
  toggleBookmark,
} from "@/lib/library/actions";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";
import { type IrabEntry } from "@/lib/irab/types";
import { type ReciterId } from "@/lib/audio/reciters";
import { type SelectedAyah } from "@/lib/quran/types";
import { type StudyContentEntry, type StudyContentKind } from "@/lib/study/types";
import { type TranslationEntry } from "@/lib/translations/types";

type AyahActionBarProps = {
  selectedAyah: SelectedAyah | null;
  isVisible: boolean;
  canPlayRange: boolean;
  onClose: () => void;
  onBookmarkOptimistic?: (isBookmarked: boolean) => void;
  onPlayRange: () => void;
  onRestoreViewport: () => void;
  onSetRangeEnd: (verseKey: string) => void;
  onStartPlayback: () => void;
  onNotify: (message: string) => void;
  rangeLabel: string | null;
  rangeOptions: Array<{ disabled?: boolean; verseKey: string; label: string }>;
  selectedRangeEndVerseKey: string | null;
};

const repeatOptions = [1, 2, 3, 5, 10];
const irabSurahCache = new Map<number, IrabEntry[]>();
const studySurahCache = new Map<string, StudyContentEntry[]>();
const translationSurahCache = new Map<number, TranslationEntry[]>();
const verseSummaryCache = new Map<number, VerseSummary[]>();

type VerseSummary = {
  verseKey: string;
  surahNumber: number;
  ayahNumber: number;
  pageNumber: number;
  text: string;
};

type ContentSlideSnapshot = {
  arabicText: string;
  pageNumber: number;
  reference: string;
  body: ReactNode;
};

export function AyahActionBar({
  canPlayRange,
  isVisible,
  onClose,
  onBookmarkOptimistic,
  onPlayRange,
  onRestoreViewport,
  onSetRangeEnd,
  onStartPlayback,
  onNotify,
  rangeLabel,
  rangeOptions,
  selectedAyah,
  selectedRangeEndVerseKey,
}: AyahActionBarProps) {
  const ayah = selectedAyah ?? {
    ayahNumber: 1,
    pageNumber: 1,
    surahNumber: 1,
    text: "",
    verseKey: "1:1",
  };
  const [message, setMessage] = useState("");
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isIrabOpen, setIsIrabOpen] = useState(false);
  const [isMeaningOpen, setIsMeaningOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isTafsirOpen, setIsTafsirOpen] = useState(false);
  const [irabEntry, setIrabEntry] = useState<IrabEntry | null>(null);
  const [irabEntries, setIrabEntries] = useState<IrabEntry[]>([]);
  const [isIrabLoading, setIsIrabLoading] = useState(false);
  const [isTranslationLoading, setIsTranslationLoading] = useState(false);
  const [isStudyLoading, setIsStudyLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteMode, setNoteMode] = useState<"ayah-insight" | "chooser" | "similar">("chooser");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [, setIsBookmarkLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [studyEntries, setStudyEntries] = useState<StudyContentEntry[]>([]);
  const [studyEntry, setStudyEntry] = useState<StudyContentEntry | null>(null);
  const [activeStudySourceId, setActiveStudySourceId] = useState<string | null>(null);
  const [translationEntries, setTranslationEntries] = useState<TranslationEntry[]>([]);
  const [translationEntry, setTranslationEntry] = useState<TranslationEntry | null>(null);
  const [activeTranslationSourceId, setActiveTranslationSourceId] = useState<string | null>(null);
  const [verseSummaries, setVerseSummaries] = useState<VerseSummary[]>([]);
  const [contentAyahNumber, setContentAyahNumber] = useState(ayah.ayahNumber);
  const [contentDragPercent, setContentDragPercent] = useState(0);
  const [isContentDragging, setIsContentDragging] = useState(false);
  const [isContentSettling, setIsContentSettling] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const audio = useAudioPlayer();
  const verseKey = selectedAyah?.verseKey;

  const activeVerseSummary =
    verseSummaries.find((verse) => verse.ayahNumber === contentAyahNumber) ?? null;
  const activePageNumber = activeVerseSummary?.pageNumber ?? ayah.pageNumber;
  const tafsirBlock = useMemo(
    () =>
      studyEntry
        ? getStudyBlock(studyEntries, studyEntry, contentAyahNumber)
        : null,
    [contentAyahNumber, studyEntries, studyEntry],
  );
  const activeTafsirBlock = isTafsirOpen ? tafsirBlock : null;
  const activeArabicText = getArabicTextForRange(
    verseSummaries,
    activeTafsirBlock?.startAyahNumber ?? contentAyahNumber,
    activeTafsirBlock?.endAyahNumber ?? contentAyahNumber,
    ayah,
  );
  const activeReference =
    activeTafsirBlock && activeTafsirBlock.startAyahNumber !== activeTafsirBlock.endAyahNumber
      ? `${ayah.surahNumber}:${activeTafsirBlock.startAyahNumber}-${ayah.surahNumber}:${activeTafsirBlock.endAyahNumber}`
      : `${ayah.surahNumber}:${contentAyahNumber}`;

  useEffect(() => {
    setIsAudioOpen(false);
    setIsIrabOpen(false);
    setIsMeaningOpen(false);
    setIsNoteOpen(false);
    setIsTafsirOpen(false);
    setIrabEntry(null);
    setIrabEntries([]);
    setTranslationEntry(null);
    setTranslationEntries([]);
    setStudyEntry(null);
    setStudyEntries([]);
    setActiveStudySourceId(null);
    setMessage("");
    setNoteMode("chooser");
    setContentAyahNumber(selectedAyah?.ayahNumber ?? 1);
    setContentDragPercent(0);
    setIsContentDragging(false);
    setIsContentSettling(false);
  }, [selectedAyah?.ayahNumber, verseKey]);

  useEffect(() => {
    let isActive = true;

    if (!verseKey) {
      setIsBookmarked(false);
      return;
    }

    setIsBookmarkLoading(true);
    getBookmarkForVerse(verseKey)
      .then((bookmark) => {
        if (isActive) {
          setIsBookmarked(Boolean(bookmark));
        }
      })
      .catch(() => {
        if (isActive) {
          setIsBookmarked(false);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsBookmarkLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [verseKey]);

  if (!selectedAyah) {
    return null;
  }

  async function loadVerseSummaries() {
    let verses = verseSummaryCache.get(ayah.surahNumber);

    if (!verses) {
      const response = await fetch(`/api/quran/surah/${ayah.surahNumber}/verses?v=1`, {
        cache: "force-cache",
      });

      if (!response.ok) {
        throw new Error("Unable to load ayah navigation.");
      }

      const payload = (await response.json()) as { verses: VerseSummary[] };
      verses = payload.verses;
      verseSummaryCache.set(ayah.surahNumber, verses);
    }

    setVerseSummaries(verses);
    return verses;
  }

  function playSingleAyah() {
    setIsMeaningOpen(false);
    setIsNoteOpen(false);
    setIsTafsirOpen(false);
    audio.playVerse({
      verseKey: ayah.verseKey,
      label: `Ayah ${ayah.verseKey}`,
    });
    setIsAudioOpen(false);
    onStartPlayback();
  }

  function playCurrentRange() {
    setIsMeaningOpen(false);
    setIsNoteOpen(false);
    setIsTafsirOpen(false);
    onPlayRange();
    setIsAudioOpen(false);
    onStartPlayback();
  }

  async function saveNote() {
    setIsSavingNote(true);
    const result = await createAyahInsight({
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      verseKey: ayah.verseKey,
      pageNumber: ayah.pageNumber,
      title: noteTitle,
      body: noteBody,
    });
    setIsSavingNote(false);

    if (result.ok) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setNoteTitle("");
      setNoteBody("");
      setNoteMode("chooser");
      setIsNoteOpen(false);
      onNotify(result.message);
      onClose();
      onRestoreViewport();
      return;
    }

    setMessage(result.message);
  }

  async function toggleCurrentBookmark() {
    const previousBookmarkState = isBookmarked;
    const nextBookmarkState = !previousBookmarkState;

    setIsBookmarked(nextBookmarkState);
    onBookmarkOptimistic?.(nextBookmarkState);
    setIsBookmarkLoading(true);
    const result = await toggleBookmark({
      surahNumber: ayah.surahNumber,
      ayahNumber: ayah.ayahNumber,
      verseKey: ayah.verseKey,
      pageNumber: ayah.pageNumber,
    });
    setIsBookmarkLoading(false);

    if (result.ok) {
      setIsBookmarked(Boolean(result.isBookmarked));
      onNotify(result.message);
      return;
    }

    setIsBookmarked(previousBookmarkState);
    onBookmarkOptimistic?.(previousBookmarkState);
    setMessage(result.message);
  }

  async function openIrab() {
    setIsAudioOpen(false);
    setIsMeaningOpen(false);
    setIsNoteOpen(false);
    setIsTafsirOpen(false);
    setIsIrabOpen(true);
    setIsIrabLoading(true);
    setMessage("");

    try {
      let entries = irabSurahCache.get(ayah.surahNumber);

      if (!entries) {
        const response = await fetch(
          `/api/irab/surah/${ayah.surahNumber}?source=furqan-karbasi-v1`,
          {
            cache: "force-cache",
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load i'rab.");
        }

        const payload = (await response.json()) as { entries: IrabEntry[] };
        entries = payload.entries;
        irabSurahCache.set(ayah.surahNumber, entries);
      }

      const ayahEntries = entries.filter((entry) => entry.ayahNumber === ayah.ayahNumber);
      setIrabEntries(ayahEntries);
      setIrabEntry(
        ayahEntries.find((entry) => entry.sourceId === "furqan-karbasi") ??
          ayahEntries[0] ??
          null,
      );
    } catch {
      setIrabEntry(null);
      setIrabEntries([]);
      setMessage("Unable to load i'rab right now.");
    } finally {
      setIsIrabLoading(false);
    }
  }

  async function openMeaning() {
    setIsAudioOpen(false);
    setIsIrabOpen(false);
    setIsMeaningOpen(true);
    setIsNoteOpen(false);
    setIsTafsirOpen(false);
    setIsTranslationLoading(true);
    setTranslationEntry(null);
    setTranslationEntries([]);
    setContentAyahNumber(ayah.ayahNumber);
    setMessage("");

    try {
      await loadVerseSummaries();
      let entries = translationSurahCache.get(ayah.surahNumber);

      if (!entries) {
        const response = await fetch(`/api/translations/surah/${ayah.surahNumber}?v=1`, {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error("Unable to load translation.");
        }

        const payload = (await response.json()) as { entries: TranslationEntry[] };
        entries = payload.entries;
        translationSurahCache.set(ayah.surahNumber, entries);
      }

      const ayahEntries = entries.filter((entry) => entry.ayahNumber === ayah.ayahNumber);
      setTranslationEntries(ayahEntries);
      const nextEntry =
        ayahEntries.find((entry) => entry.sourceId === activeTranslationSourceId) ??
        ayahEntries[0] ??
        null;
      setTranslationEntry(nextEntry);
      setActiveTranslationSourceId(nextEntry?.sourceId ?? null);
    } catch {
      setTranslationEntry(null);
      setTranslationEntries([]);
      setMessage("Unable to load translation right now.");
    } finally {
      setIsTranslationLoading(false);
    }
  }

  async function openStudy(kind: Exclude<StudyContentKind, "meaning" | "translation">) {
    setIsAudioOpen(false);
    setIsIrabOpen(false);
    setIsMeaningOpen(false);
    setIsNoteOpen(false);
    setIsTafsirOpen(kind === "tafsir");
    setIsStudyLoading(true);
    setStudyEntry(null);
    setStudyEntries([]);
    setContentAyahNumber(ayah.ayahNumber);
    setMessage("");

    try {
      await loadVerseSummaries();
      const cacheKey = `${kind}:${ayah.surahNumber}`;
      let entries = studySurahCache.get(cacheKey);

      if (!entries) {
        const response = await fetch(`/api/study/${kind}/surah/${ayah.surahNumber}?v=1`, {
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error(`Unable to load ${kind}.`);
        }

        const payload = (await response.json()) as { entries: StudyContentEntry[] };
        entries = payload.entries;
        studySurahCache.set(cacheKey, entries);
      }

      setStudyEntries(entries);
      const nextEntry = findStudyEntryForAyah(
        entries,
        ayah.ayahNumber,
        activeStudySourceId,
      );
      setStudyEntry(nextEntry);
      setActiveStudySourceId(nextEntry?.sourceId ?? null);
    } catch {
      setStudyEntry(null);
      setStudyEntries([]);
      setMessage(`Unable to load ${kind} right now.`);
    } finally {
      setIsStudyLoading(false);
    }
  }

  function updateMeaningForAyah(ayahNumber: number, sourceId = activeTranslationSourceId) {
    const allEntries = translationSurahCache.get(ayah.surahNumber) ?? [];
    const ayahEntries = allEntries.filter((entry) => entry.ayahNumber === ayahNumber);
    const nextEntry =
      ayahEntries.find((entry) => entry.sourceId === sourceId) ?? ayahEntries[0] ?? null;

    setTranslationEntries(ayahEntries);
    setTranslationEntry(nextEntry);
    setActiveTranslationSourceId(nextEntry?.sourceId ?? sourceId ?? null);
  }

  function updateTafsirForAyah(ayahNumber: number, sourceId = activeStudySourceId) {
    const nextEntry = findStudyEntryForAyah(studyEntries, ayahNumber, sourceId);

    setStudyEntry(nextEntry);
    setActiveStudySourceId(nextEntry?.sourceId ?? sourceId ?? null);
  }

  function renderMeaningBody(entry: TranslationEntry | null, entries: TranslationEntry[]) {
    if (!entry) {
      return (
        <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center">
          <p className="text-sm font-bold text-ink">No translation entry available for this ayah yet.</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-ink/50">
            Run `npm run inspect:qf-translations` and `npm run import:qf-translations` to generate local English translation data.
          </p>
        </div>
      );
    }

    return (
      <>
        {entries.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto rounded-2xl bg-mist p-1">
            {entries.map((candidate) => (
              <button
                className={`min-h-10 shrink-0 rounded-xl px-3 text-sm font-bold transition ${
                  entry.sourceId === candidate.sourceId
                    ? "bg-paper text-palm shadow-soft"
                    : "text-ink/55"
                }`}
                key={candidate.sourceId}
                onClick={() => {
                  setTranslationEntry(candidate);
                  setActiveTranslationSourceId(candidate.sourceId);
                }}
                type="button"
              >
                {getDisplaySourceName(candidate.sourceName, candidate.sourceId)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="rounded-3xl border border-line bg-white/80 px-4 py-4 shadow-soft">
          <div className="whitespace-pre-wrap text-left text-base leading-8 text-ink" dir="ltr" lang="en">
            {entry.text}
          </div>
          <p className="mt-4 border-t border-line pt-3 text-xs font-bold uppercase tracking-wide text-ink/40">
            Source: {entry.sourceName}
          </p>
        </div>
      </>
    );
  }

  function renderTafsirBody(entry: StudyContentEntry | null, ayahNumber = contentAyahNumber) {
    if (!entry) {
      return (
        <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center">
          <p className="text-sm font-bold text-ink">No tafsir entry available for this ayah yet.</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-ink/50">
            Run `npm run import:study:quran-db` to generate the available Arabic tafsir data.
          </p>
        </div>
      );
    }

    const sourcesForAyah = getStudySourcesForAyah(studyEntries, ayahNumber);

    return (
      <>
        {sourcesForAyah.length > 1 ? (
          <div className="flex gap-1 rounded-2xl bg-mist p-1">
            {sourcesForAyah.map((candidate) => (
              <button
                className={`min-h-10 min-w-0 flex-1 rounded-xl px-1.5 text-[0.68rem] font-bold transition sm:text-sm ${
                  entry.sourceId === candidate.sourceId
                    ? "bg-paper text-palm shadow-soft"
                    : "text-ink/55"
                }`}
                key={candidate.sourceId}
                onClick={() => {
                  setStudyEntry(candidate);
                  setActiveStudySourceId(candidate.sourceId);
                }}
                type="button"
              >
                {getDisplaySourceName(candidate.source, candidate.sourceId)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="rounded-3xl border border-line bg-white/80 px-4 py-4 shadow-soft">
          <div
            className={`whitespace-pre-wrap ${
              entry.direction === "rtl" ? "text-right text-lg leading-9" : "text-left text-base leading-7"
            } text-ink`}
            dir={entry.direction}
            lang={entry.language}
          >
            <HighlightedStudyText entry={entry} />
          </div>
          <p className="mt-4 border-t border-line pt-3 text-xs font-bold uppercase tracking-wide text-ink/40">
            Source: {getDisplaySourceName(entry.source, entry.sourceId)}
          </p>
        </div>
      </>
    );
  }

  function getTargetAyahNumber(delta: number) {
    const current = isTafsirOpen && tafsirBlock
      ? delta > 0
        ? tafsirBlock.endAyahNumber
        : tafsirBlock.startAyahNumber
      : contentAyahNumber;

    return current + delta;
  }

  function getMeaningSnapshotForAyah(ayahNumber: number, sourceId = activeTranslationSourceId) {
    const allEntries = translationSurahCache.get(ayah.surahNumber) ?? [];
    const ayahEntries = allEntries.filter((entry) => entry.ayahNumber === ayahNumber);
    const entry =
      ayahEntries.find((candidate) => candidate.sourceId === sourceId) ??
      ayahEntries[0] ??
      null;
    const verse = verseSummaries.find((candidate) => candidate.ayahNumber === ayahNumber);

    return {
      arabicText: verse?.text ?? ayah.text,
      body: renderMeaningBody(entry, ayahEntries),
      pageNumber: verse?.pageNumber ?? ayah.pageNumber,
      reference: `${ayah.surahNumber}:${ayahNumber}`,
    };
  }

  function getTafsirSnapshotForAyah(ayahNumber: number, sourceId = activeStudySourceId) {
    const entry = findStudyEntryForAyah(studyEntries, ayahNumber, sourceId);
    const block = entry ? getStudyBlock(studyEntries, entry, ayahNumber) : null;
    const startAyahNumber = block?.startAyahNumber ?? ayahNumber;
    const endAyahNumber = block?.endAyahNumber ?? ayahNumber;
    const verse = verseSummaries.find((candidate) => candidate.ayahNumber === ayahNumber);

    return {
      arabicText: getArabicTextForRange(verseSummaries, startAyahNumber, endAyahNumber, ayah),
      body: renderTafsirBody(entry, ayahNumber),
      pageNumber: verse?.pageNumber ?? ayah.pageNumber,
      reference:
        startAyahNumber !== endAyahNumber
          ? `${ayah.surahNumber}:${startAyahNumber}-${ayah.surahNumber}:${endAyahNumber}`
          : `${ayah.surahNumber}:${ayahNumber}`,
    };
  }

  function getContentSnapshotForAyah(ayahNumber: number) {
    return isMeaningOpen ? getMeaningSnapshotForAyah(ayahNumber) : getTafsirSnapshotForAyah(ayahNumber);
  }

  function navigateStudy(delta: number) {
    const nextAyahNumber = getTargetAyahNumber(delta);
    const nextVerse = verseSummaries.find((verse) => verse.ayahNumber === nextAyahNumber);

    if (!nextVerse) {
      setIsContentDragging(false);
      setIsContentSettling(false);
      setContentDragPercent(0);
      return;
    }

    setIsContentDragging(false);
    setIsContentSettling(true);
    setContentDragPercent(delta > 0 ? -100 : 100);

    window.setTimeout(() => {
      setContentAyahNumber(nextVerse.ayahNumber);

      if (isMeaningOpen) {
        updateMeaningForAyah(nextVerse.ayahNumber);
      } else if (isTafsirOpen) {
        updateTafsirForAyah(nextVerse.ayahNumber);
      }

      setIsContentDragging(true);
      setIsContentSettling(false);
      setContentDragPercent(0);
      window.requestAnimationFrame(() => setIsContentDragging(false));
    }, 260);
  }

  function handleContentTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start) {
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.25) {
      setIsContentDragging(false);
      setIsContentSettling(true);
      setContentDragPercent(0);
      window.setTimeout(() => setIsContentSettling(false), 260);
      return;
    }

    navigateStudy(dx < 0 ? 1 : -1);
  }

  function handleContentTouchMove(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;

    if (!start) {
      return;
    }

    const dx = event.touches[0].clientX - start.x;
    const dy = event.touches[0].clientY - start.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      setContentDragPercent(0);
      return;
    }

    if (Math.abs(dx) > 6) {
      event.preventDefault();
      setIsContentDragging(true);
    }

    const delta = dx < 0 ? 1 : -1;
    const hasTarget = verseSummaries.some(
      (verse) => verse.ayahNumber === getTargetAyahNumber(delta),
    );
    const width = Math.max(1, event.currentTarget.clientWidth);
    const resistance = hasTarget ? 1 : 0.28;
    const percent = Math.max(-100, Math.min(100, (dx / width) * 100 * resistance));

    setContentDragPercent(percent);
  }

  return (
    <>
      {isAudioOpen || isIrabOpen || isMeaningOpen || isNoteOpen || isTafsirOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/18 backdrop-blur-[1px]">
          <div
            className={`absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-3xl overflow-hidden rounded-t-[2rem] border-x border-t border-line bg-paper shadow-[0_-20px_70px_rgba(31,39,33,0.24)] transition-transform duration-300 ${
              isAudioOpen || isIrabOpen || isMeaningOpen || isNoteOpen || isTafsirOpen
                ? "translate-y-0"
                : "translate-y-full"
            }`}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-ink/15" />
            {isAudioOpen ? (
              <div className="max-h-[calc(88dvh-1rem)] overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                <SheetHeader
                  eyebrow={rangeLabel ?? `Ayah ${ayah.verseKey}`}
                  onClose={() => {
                    setIsAudioOpen(false);
                    onRestoreViewport();
                  }}
                  title="Audio repetition"
                />
                <div className="mt-5 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wide text-ink/45">
                    Reciter
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-4 text-sm font-semibold text-ink"
                      onChange={(event) =>
                        audio.setCurrentReciter(event.target.value as ReciterId)
                      }
                      value={audio.currentReciter}
                    >
                      {audio.reciters.map((reciter) => (
                        <option key={reciter.id} value={reciter.id}>
                          {reciter.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-bold uppercase tracking-wide text-ink/45">
                      Ayah repeat
                      <select
                        className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-4 text-sm font-semibold text-ink"
                        onChange={(event) =>
                          audio.setVerseRepeatCount(Number(event.target.value))
                        }
                        value={audio.verseRepeatCount}
                      >
                        {repeatOptions.map((count) => (
                          <option key={count} value={count}>
                            x{count}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-bold uppercase tracking-wide text-ink/45">
                      Range repeat
                      <select
                        className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-4 text-sm font-semibold text-ink"
                        onChange={(event) =>
                          audio.setRangeRepeatCount(Number(event.target.value))
                        }
                        value={audio.rangeRepeatCount}
                      >
                        {repeatOptions.map((count) => (
                          <option key={count} value={count}>
                            x{count}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-ink/45">
                    Stop ayah
                    <select
                      className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-4 text-sm font-semibold text-ink"
                      onChange={(event) => onSetRangeEnd(event.target.value)}
                      value={selectedRangeEndVerseKey ?? ayah.verseKey}
                    >
                      {rangeOptions.map((option) => (
                        <option
                          disabled={option.disabled}
                          key={option.verseKey}
                          value={option.verseKey}
                        >
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-mist px-4 text-sm font-bold text-palm transition hover:bg-palm/10 focus:outline-none focus:ring-2 focus:ring-palm/25"
                      onClick={audio.stop}
                      type="button"
                    >
                      <Square aria-hidden className="size-4" />
                      Stop
                    </button>
                    <button
                      className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-palm px-4 text-sm font-bold text-white transition hover:bg-[#244b3d] focus:outline-none focus:ring-2 focus:ring-palm/25"
                      onClick={canPlayRange ? playCurrentRange : playSingleAyah}
                      type="button"
                    >
                      <Play aria-hidden className="size-4" />
                      Play
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {isNoteOpen ? (
              <div className="max-h-[calc(88dvh-1rem)] overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                <SheetHeader
                  eyebrow={rangeLabel ?? `Ayah ${ayah.verseKey}`}
                  onClose={() => {
                    setIsNoteOpen(false);
                    setNoteMode("chooser");
                    onRestoreViewport();
                  }}
                  title={
                    noteMode === "ayah-insight"
                      ? "Ayah Insight"
                      : noteMode === "similar"
                        ? "Similar Verses"
                        : "Choose note type"
                  }
                />
                {noteMode === "chooser" ? (
                  <div className="mt-5 grid gap-3">
                    <button
                      className="flex items-start gap-3 rounded-3xl border border-line bg-mist/70 px-4 py-4 text-left transition hover:border-palm/25 hover:bg-palm/5"
                      onClick={() => setNoteMode("ayah-insight")}
                      type="button"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-palm/10 text-palm">
                        <Lightbulb aria-hidden className="size-5" />
                      </span>
                      <span>
                        <span className="block text-base font-extrabold text-ink">
                          Ayah Insight
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-ink/55">
                          Save a hifz cue, reflection, or personal benefit tied to this ayah.
                        </span>
                      </span>
                    </button>
                    <button
                      className="flex items-start gap-3 rounded-3xl border border-line bg-mist/70 px-4 py-4 text-left transition hover:border-palm/25 hover:bg-palm/5"
                      onClick={() => {
                        window.location.href = `/app/library/similar-verses/new?verseKey=${encodeURIComponent(ayah.verseKey)}`;
                      }}
                      type="button"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-palm/10 text-palm">
                        <Sparkles aria-hidden className="size-5" />
                      </span>
                      <span>
                        <span className="block text-base font-extrabold text-ink">
                          Similar Verses
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-ink/55">
                          Start a mutashabihat record with this ayah already attached.
                        </span>
                      </span>
                    </button>
                  </div>
                ) : null}
                {noteMode === "ayah-insight" ? (
                  <div className="mt-5 space-y-3">
                    <div
                      className="rounded-3xl border border-palm/10 bg-palm/5 px-4 py-4 text-right text-xl leading-10 text-ink"
                      dir="rtl"
                      lang="ar"
                    >
                      {ayah.text}
                    </div>
                    <input
                      className="h-12 w-full rounded-2xl border border-line bg-mist px-4 text-base font-semibold text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
                      onChange={(event) => setNoteTitle(event.target.value)}
                      placeholder="Title optional"
                      value={noteTitle}
                    />
                    <textarea
                      className="min-h-44 w-full resize-none rounded-2xl border border-line bg-mist px-4 py-3 text-base leading-7 text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
                      onChange={(event) => setNoteBody(event.target.value)}
                      placeholder="Write your ayah insight"
                      value={noteBody}
                    />
                    <button
                      className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-palm px-4 text-sm font-bold text-white transition hover:bg-[#244b3d] focus:outline-none focus:ring-2 focus:ring-palm/25 disabled:opacity-60"
                      disabled={isSavingNote || !noteBody.trim()}
                      onClick={saveNote}
                      type="button"
                    >
                      {isSavingNote ? "Saving..." : "Save insight"}
                    </button>
                  </div>
                ) : null}
                {noteMode === "similar" ? (
                  <div className="mt-5 rounded-3xl border border-line bg-mist px-5 py-7 text-center">
                    <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-palm/10 text-palm">
                      <Sparkles aria-hidden className="size-7" />
                    </div>
                    <p className="mt-4 text-base font-extrabold text-ink">
                      Similar Verses is coming later
                    </p>
                    <p className="mt-2 text-sm leading-6 text-ink/60">
                      Mutqin will let you connect this ayah to related wording patterns and
                      mutashabihat. For now, use Ayah Insight for personal notes.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isMeaningOpen || isTafsirOpen ? (
              <div className="max-h-[calc(88dvh-1rem)] overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                <SheetHeader
                  eyebrow={`${activeReference} · Page ${activePageNumber}`}
                  onClose={() => {
                    setIsMeaningOpen(false);
                    setIsTafsirOpen(false);
                    onRestoreViewport();
                  }}
                  title={isMeaningOpen ? "Translation" : "Tafsir"}
                />
                <div
                  className="mt-5 px-1 pb-2"
                  onTouchEnd={handleContentTouchEnd}
                  onTouchMove={handleContentTouchMove}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
                    setIsContentDragging(true);
                    setIsContentSettling(false);
                    setContentDragPercent(0);
                  }}
                >
                  {isMeaningOpen && isTranslationLoading ? (
                    <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center text-sm font-semibold text-ink/55">
                      Loading translation...
                    </div>
                  ) : isTafsirOpen && isStudyLoading ? (
                    <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center text-sm font-semibold text-ink/55">
                      Loading tafsir...
                    </div>
                  ) : (
                    <StudyPageSlider
                      active={{
                        arabicText: activeArabicText,
                        body: isMeaningOpen
                          ? renderMeaningBody(translationEntry, translationEntries)
                          : renderTafsirBody(studyEntry),
                        pageNumber: activePageNumber,
                        reference: activeReference,
                      }}
                      dragPercent={contentDragPercent}
                      isDragging={isContentDragging}
                      isSettling={isContentSettling}
                      next={
                        verseSummaries.some(
                          (verse) => verse.ayahNumber === getTargetAyahNumber(1),
                        )
                          ? getContentSnapshotForAyah(getTargetAyahNumber(1))
                          : null
                      }
                      previous={
                        verseSummaries.some(
                          (verse) => verse.ayahNumber === getTargetAyahNumber(-1),
                        )
                          ? getContentSnapshotForAyah(getTargetAyahNumber(-1))
                          : null
                      }
                    />
                  )}
                </div>
              </div>
            ) : null}
            {isIrabOpen ? (
              <div className="max-h-[calc(88dvh-1rem)] overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
                <SheetHeader
                  eyebrow={`Ayah ${ayah.verseKey}`}
                  onClose={() => {
                    setIsIrabOpen(false);
                    onRestoreViewport();
                  }}
                  title="Iʿrāb"
                />
                <div className="mt-5 space-y-4">
                  <div
                    className="rounded-3xl border border-palm/10 bg-palm/5 px-4 py-4 text-right text-xl leading-10 text-ink shadow-[inset_0_0_0_1px_rgba(47,96,78,0.03)]"
                    dir="rtl"
                    lang="ar"
                  >
                    {ayah.text}
                  </div>
                  {isIrabLoading ? (
                    <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center text-sm font-semibold text-ink/55">
                      Loading iʿrāb...
                    </div>
                  ) : irabEntry ? (
                    <>
                      {irabEntries.length > 1 ? (
                        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mist p-1">
                          {irabEntries.map((entry) => (
                            <button
                              className={`min-h-10 rounded-xl px-3 text-sm font-bold transition ${
                                irabEntry.sourceId === entry.sourceId
                                  ? "bg-paper text-palm shadow-soft"
                                  : "text-ink/55"
                              }`}
                              key={entry.sourceId ?? entry.source}
                              onClick={() => setIrabEntry(entry)}
                              type="button"
                            >
                              {entry.source.replace("Furqan - ", "")}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="rounded-3xl border border-line bg-white/80 p-3 shadow-soft">
                        <IrabGlossary text={irabEntry.text} />
                        <p className="mt-4 border-t border-line px-1 pt-3 text-xs font-bold uppercase tracking-wide text-ink/40">
                          Source: {irabEntry.source}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-3xl border border-line bg-mist px-4 py-8 text-center">
                      <p className="text-sm font-bold text-ink">
                        No iʿrāb entry available for this ayah yet.
                      </p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-ink/50">
                        Add Furqan data under `data-sources/furqan/` and run
                        `npm run import:irab:furqan` to generate trial iʿrāb data.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-transform duration-200 ${
          isVisible ? "translate-y-0" : "translate-y-[calc(100%+1rem)]"
        }`}
      >
      <div className="mx-auto w-full max-w-[calc(100vw-1rem)] overflow-hidden rounded-[1.4rem] border border-line bg-paper/95 shadow-[0_-18px_60px_rgba(31,39,33,0.18)] backdrop-blur sm:max-w-[44rem]">
        <div className="flex items-center gap-1 px-3 py-2">
          <div className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-palm/25 bg-palm/8 text-sm font-bold text-palm">
            {ayah.ayahNumber}
          </div>
          <div className="min-w-0 flex-1 px-1">
            <div className="relative min-w-0 flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-paper/95 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-paper/85 via-paper/35 to-transparent" />
              <div className="flex gap-1 overflow-x-auto pl-1 pr-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ActionIcon
                  icon={Headphones}
                  label="Play"
                  onClick={() => {
                    setIsIrabOpen(false);
                    setIsMeaningOpen(false);
                    setIsNoteOpen(false);
                    setIsTafsirOpen(false);
                    setIsAudioOpen(true);
                  }}
                />
                <ActionIcon icon={Languages} label="Translation" onClick={() => void openMeaning()} />
                <ActionIcon icon={BookOpenText} label="Tafsir" onClick={() => void openStudy("tafsir")} />
                <ActionIcon icon={BookMarked} label="Iʿrāb" onClick={() => void openIrab()} />
                <ActionIcon
                  icon={isBookmarked ? BookMarked : Bookmark}
                  isActive={isBookmarked}
                  label={isBookmarked ? "Bookmarked" : "Bookmark"}
                  onClick={() => {
                    void toggleCurrentBookmark();
                  }}
                />
              </div>
            </div>
          </div>
          <button
            aria-label="Close ayah actions"
            className="ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink/50 transition hover:bg-mist hover:text-ink focus:outline-none focus:ring-2 focus:ring-palm/25"
            onClick={() => {
              setMessage("");
              setIsAudioOpen(false);
              setIsIrabOpen(false);
              setIsMeaningOpen(false);
              setIsNoteOpen(false);
              setNoteMode("chooser");
              setIsTafsirOpen(false);
              onClose();
              onRestoreViewport();
            }}
            type="button"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      {rangeLabel ? (
        <p className="mx-auto mt-2 max-w-3xl rounded-xl bg-paper/90 px-3 py-2 text-center text-xs font-bold text-palm shadow-soft">
          {rangeLabel}
        </p>
      ) : null}
      {message ? (
        <p className="mx-auto mt-2 max-w-3xl rounded-xl bg-palm px-3 py-2 text-center text-sm font-semibold text-white">
          {message}
        </p>
      ) : null}
      </div>
    </>
  );
}

type ActionIconProps = {
  icon: typeof Headphones;
  label: string;
  isActive?: boolean;
  onClick: () => void;
};

function ActionIcon({ icon: Icon, isActive, label, onClick }: ActionIconProps) {
  return (
    <button
      className="flex min-h-14 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-full text-[0.68rem] font-bold text-ink/55 transition hover:text-palm focus:outline-none focus:ring-2 focus:ring-palm/20"
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex size-8 items-center justify-center rounded-full ${
          isActive ? "bg-palm text-white" : "bg-transparent text-ink/65"
        }`}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span>{label}</span>
    </button>
  );
}

type SheetHeaderProps = {
  eyebrow: string;
  onClose: () => void;
  title: string;
};

function SheetHeader({ eyebrow, onClose, title }: SheetHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xl font-bold text-ink">{title}</p>
        <p className="mt-1 truncate text-sm font-semibold text-ink/50">{eyebrow}</p>
      </div>
      <button
        aria-label={`Close ${title}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mist text-ink/55 transition hover:text-ink focus:outline-none focus:ring-2 focus:ring-palm/25"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

function StudyPage({ snapshot }: { snapshot: ContentSlideSnapshot }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [snapshot.reference, snapshot.pageNumber]);

  return (
    <div
      className="h-full space-y-4 overflow-y-auto overscroll-contain px-1 pb-4"
      ref={scrollRef}
    >
      <div
        className="rounded-3xl border border-palm/10 bg-palm/5 px-4 py-4 text-right text-xl leading-10 text-ink shadow-[inset_0_0_0_1px_rgba(47,96,78,0.03)]"
        dir="rtl"
        lang="ar"
      >
        {snapshot.arabicText}
      </div>
      {snapshot.body}
    </div>
  );
}

function StudyPageSlider({
  active,
  dragPercent,
  isDragging,
  isSettling,
  next,
  previous,
}: {
  active: ContentSlideSnapshot;
  dragPercent: number;
  isDragging: boolean;
  isSettling: boolean;
  next: ContentSlideSnapshot | null;
  previous: ContentSlideSnapshot | null;
}) {
  const panes = [
    { position: -1, snapshot: previous },
    { position: 0, snapshot: active },
    { position: 1, snapshot: next },
  ];

  return (
    <div className="relative h-[calc(88dvh-7rem)] min-h-[58dvh] max-h-[74dvh] overflow-hidden touch-pan-y">
      {panes.map(({ position, snapshot }) =>
        snapshot ? (
          <div
            className={`absolute inset-y-0 left-0 w-full bg-paper px-1 ${
              (!isDragging || isSettling) && "transition-transform duration-[260ms] ease-out"
            }`}
            key={`${position}-${snapshot.reference}-${snapshot.pageNumber}`}
            style={{
              transform: `translate3d(${position * 100 + dragPercent}%, 0, 0)`,
            }}
          >
            <StudyPage snapshot={snapshot} />
          </div>
        ) : null,
      )}
    </div>
  );
}

function getDisplaySourceName(source: string, sourceId?: string) {
  if (sourceId === "qf-tafsir-169-ibn-kathir-abridged") {
    return "Ibn Kathir";
  }

  return source
    .replace("Quran Foundation - ", "")
    .replace("Quran-Database - Tafsir ", "")
    .replace("Quran-Database - ", "")
    .replace("Tafsir ", "")
    .replace("As-Saadi", "Saadi")
    .replace("Al-Muyassar", "Muyassar")
    .replace("Al-Baghawi", "Baghawi");
}

function getStudySourcesForAyah(entries: StudyContentEntry[], ayahNumber: number) {
  const seen = new Set<string>();
  return getStudyEntriesForAyah(entries, ayahNumber).filter((entry) => {
    if (seen.has(entry.sourceId)) {
      return false;
    }

    seen.add(entry.sourceId);
    return true;
  });
}

function getStudyEntriesForAyah(entries: StudyContentEntry[], ayahNumber: number) {
  const sourceIds = Array.from(new Set(entries.map((entry) => entry.sourceId)));

  return sourceIds
    .map((sourceId) => findStudyEntryForAyah(entries, ayahNumber, sourceId))
    .filter((entry): entry is StudyContentEntry => Boolean(entry));
}

function findStudyEntryForAyah(
  entries: StudyContentEntry[],
  ayahNumber: number,
  sourceId?: string | null,
) {
  const candidates = sourceId
    ? entries.filter((entry) => entry.sourceId === sourceId)
    : entries;
  const exact = candidates.find((entry) => entry.ayahNumber === ayahNumber);

  if (exact) {
    return exact;
  }

  return candidates.find((entry) =>
    getExplicitTafsirRange(entry).some(
      (range) => ayahNumber >= range.startAyahNumber && ayahNumber <= range.endAyahNumber,
    ),
  ) ?? null;
}

function getStudyBlock(
  entries: StudyContentEntry[],
  activeEntry: StudyContentEntry,
  ayahNumber: number,
) {
  const explicitRange = getExplicitTafsirRange(activeEntry).find(
    (range) => ayahNumber >= range.startAyahNumber && ayahNumber <= range.endAyahNumber,
  );

  if (explicitRange) {
    return explicitRange;
  }

  const sourceEntries = entries
    .filter((entry) => entry.sourceId === activeEntry.sourceId)
    .sort((a, b) => a.ayahNumber - b.ayahNumber);
  const activeIndex = sourceEntries.findIndex((entry) => entry.ayahNumber === ayahNumber);

  if (activeIndex < 0) {
    return {
      startAyahNumber: activeEntry.ayahNumber,
      endAyahNumber: activeEntry.ayahNumber,
    };
  }

  let startIndex = activeIndex;
  let endIndex = activeIndex;

  while (
    startIndex > 0 &&
    sourceEntries[startIndex - 1].text === activeEntry.text &&
    sourceEntries[startIndex - 1].ayahNumber === sourceEntries[startIndex].ayahNumber - 1
  ) {
    startIndex -= 1;
  }

  while (
    endIndex < sourceEntries.length - 1 &&
    sourceEntries[endIndex + 1].text === activeEntry.text &&
    sourceEntries[endIndex + 1].ayahNumber === sourceEntries[endIndex].ayahNumber + 1
  ) {
    endIndex += 1;
  }

  return {
    startAyahNumber: sourceEntries[startIndex].ayahNumber,
    endAyahNumber: sourceEntries[endIndex].ayahNumber,
  };
}

function getExplicitTafsirRange(entry: StudyContentEntry) {
  const ranges = Array.from(
    entry.text.matchAll(
      new RegExp(`${entry.surahNumber}:([0-9]{1,3})\\s*-\\s*(?:${entry.surahNumber}:)?([0-9]{1,3})`, "g"),
    ),
  )
    .map((match) => ({
      startAyahNumber: Number(match[1]),
      endAyahNumber: Number(match[2]),
    }))
    .filter(
      (range) =>
        Number.isFinite(range.startAyahNumber) &&
        Number.isFinite(range.endAyahNumber) &&
        range.startAyahNumber <= range.endAyahNumber &&
        entry.ayahNumber >= range.startAyahNumber &&
        entry.ayahNumber <= range.endAyahNumber,
    );

  return ranges;
}

function getArabicTextForRange(
  verses: VerseSummary[],
  startAyahNumber: number,
  endAyahNumber: number,
  fallback: SelectedAyah,
) {
  const selectedVerses = verses.filter(
    (verse) => verse.ayahNumber >= startAyahNumber && verse.ayahNumber <= endAyahNumber,
  );

  if (!selectedVerses.length) {
    return fallback.text;
  }

  return selectedVerses
    .map((verse) => `${verse.text} ﴿${verse.ayahNumber}﴾`)
    .join(" ");
}

function getHighlightPattern(entry: StudyContentEntry) {
  if (entry.sourceId === "qf-tafsir-169-ibn-kathir-abridged") {
    return /(\([^()\n]+\))/;
  }

  if (entry.sourceId === "quran-database-saadi") {
    return /(\{[^{}\n]+\})/;
  }

  if (entry.sourceId === "quran-database-baghawi") {
    return /(\{[^{}\n]+\}|﴿[^﴾\n]+﴾)/;
  }

  return null;
}

function HighlightedStudyText({ entry }: { entry: StudyContentEntry }) {
  if (entry.sourceId === "qf-tafsir-169-ibn-kathir-abridged") {
    return <IbnKathirFormattedText entry={entry} />;
  }

  const pattern = getHighlightPattern(entry);

  if (!pattern) {
    return <>{entry.text}</>;
  }

  return <InlineHighlightedText pattern={pattern} text={entry.text} />;
}

function InlineHighlightedText({ pattern, text }: { pattern: RegExp; text: string }) {
  const pieces = text.split(pattern).filter(Boolean);

  return (
    <>
      {pieces.map((piece, index) =>
        pattern.test(piece) && !isPlainNumberParenthetical(piece) ? (
          <strong
            className="font-extrabold italic text-palm"
            key={`${piece}-${index}`}
          >
            {piece}
          </strong>
        ) : (
          <span key={`${piece}-${index}`}>{piece}</span>
        ),
      )}
    </>
  );
}

function isPlainNumberParenthetical(text: string) {
  return /^\(\s*[\d\s:.,-]+\s*\)$/.test(text);
}

function IbnKathirFormattedText({ entry }: { entry: StudyContentEntry }) {
  const blocks = parseIbnKathirBlocks(entry.text);

  return (
    <div className="space-y-4">
      {blocks.map((block, index) =>
        block.kind === "heading" ? (
          <div
            className="rounded-2xl border border-palm/10 bg-palm/8 px-3 py-2 text-sm font-extrabold uppercase tracking-wide text-palm"
            key={`${block.text}-${index}`}
          >
            {block.text}
          </div>
        ) : (
          <p className="whitespace-pre-wrap" key={`${block.text}-${index}`}>
            <IbnKathirHighlightedText text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}

function IbnKathirHighlightedText({ text }: { text: string }) {
  const pieces = splitBalancedParentheses(text);

  return (
    <>
      {pieces.map((piece, index) =>
        piece.kind === "quote" && !isPlainNumberParenthetical(piece.text) ? (
          <strong
            className="font-extrabold italic text-palm"
            key={`${piece.text}-${index}`}
          >
            {piece.text}
          </strong>
        ) : (
          <span key={`${piece.text}-${index}`}>{piece.text}</span>
        ),
      )}
    </>
  );
}

function splitBalancedParentheses(text: string) {
  const pieces: Array<{ kind: "quote" | "text"; text: string }> = [];
  let textStart = 0;
  let quoteStart = -1;
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "(") {
      if (depth === 0) {
        if (index > textStart) {
          pieces.push({ kind: "text", text: text.slice(textStart, index) });
        }
        quoteStart = index;
      }
      depth += 1;
      continue;
    }

    if (character === ")" && depth > 0) {
      depth -= 1;

      if (depth === 0 && quoteStart >= 0) {
        pieces.push({ kind: "quote", text: text.slice(quoteStart, index + 1) });
        textStart = index + 1;
        quoteStart = -1;
      }
    }
  }

  if (textStart < text.length) {
    pieces.push({ kind: "text", text: text.slice(textStart) });
  }

  return pieces;
}

function parseIbnKathirBlocks(text: string) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.flatMap(parseIbnKathirParagraph);
}

function parseIbnKathirParagraph(paragraph: string): Array<{
  kind: "body" | "heading";
  text: string;
}> {
  const split = findGluedIbnKathirHeading(paragraph);

  if (!split) {
    return [{ kind: "body", text: paragraph }];
  }

  return [
    split.before ? { kind: "body" as const, text: split.before } : null,
    { kind: "heading" as const, text: split.heading },
    ...parseIbnKathirParagraph(split.after),
  ].filter((block): block is { kind: "body" | "heading"; text: string } =>
    Boolean(block?.text),
  );
}

function findGluedIbnKathirHeading(paragraph: string) {
  const matches = Array.from(paragraph.matchAll(/[a-z)]([A-Z][a-z])/g));

  for (const match of matches) {
    if (typeof match.index !== "number" || match.index < 8) {
      continue;
    }

    const bodyStart = match.index + 1;

    if (isApostropheNameBoundary(paragraph, bodyStart)) {
      continue;
    }

    const headingStart = findIbnKathirHeadingStart(paragraph, bodyStart);
    const heading = paragraph.slice(headingStart, bodyStart).trim();
    const after = paragraph.slice(bodyStart).trim();

    if (after && isLikelyIbnKathirHeading(heading)) {
      return {
        after,
        before: paragraph.slice(0, headingStart).trim(),
        heading,
      };
    }
  }

  return null;
}

function isApostropheNameBoundary(text: string, bodyStart: number) {
  const previous = text[bodyStart - 1];
  const current = text[bodyStart];

  if (!previous || !current || !/[A-Z]/.test(current)) {
    return false;
  }

  return previous === "'" || previous === "`" || previous === "’" || previous === "‘";
}

function findIbnKathirHeadingStart(paragraph: string, bodyStart: number) {
  const before = paragraph.slice(0, bodyStart);
  const boundaries = [
    before.lastIndexOf("."),
    before.lastIndexOf("!"),
    before.lastIndexOf("?"),
    before.lastIndexOf("\n"),
  ];
  const boundary = Math.max(...boundaries);

  return boundary >= 0 ? boundary + 1 : 0;
}

function isLikelyIbnKathirHeading(text: string) {
  return (
    text.length >= 8 &&
    text.length <= 96 &&
    !/[\u0600-\u06ff]/.test(text) &&
    !/[.;:،؟!?]/.test(text) &&
    !/\b(said|reported|recorded|narrated|commented|means)\b/i.test(text) &&
    /[A-Za-z]/.test(text)
  );
}

type IrabGlossaryItem = {
  explanation: string;
  word: string;
};

function parseIrabGlossary(text: string): IrabGlossaryItem[] {
  const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const matches = Array.from(
    normalizedText.matchAll(/«([^»]+)»\s*([\s\S]*?)(?=\n{2,}«|$)/g),
  );

  if (matches.length === 0) {
    return [{ word: "الإعراب", explanation: normalizedText }];
  }

  return matches.map((match) => ({
    word: match[1].trim(),
    explanation: match[2].trim(),
  }));
}

function IrabGlossary({ text }: { text: string }) {
  const items = parseIrabGlossary(text);

  return (
    <div className="space-y-2.5" dir="rtl" lang="ar">
      {items.map((item, index) => (
        <article
          className="rounded-2xl border border-line/80 bg-paper/75 px-3.5 py-3 text-right shadow-[0_8px_20px_rgba(31,39,33,0.04)]"
          key={`${item.word}-${index}`}
        >
          <div className="mb-2 flex justify-start">
            <span className="rounded-full bg-palm/10 px-3 py-1.5 text-xl font-bold leading-none text-palm ring-1 ring-palm/15">
              {item.word}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-[0.98rem] leading-8 text-ink/82">
            {item.explanation}
          </p>
        </article>
      ))}
    </div>
  );
}
