"use client";

import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createSimilarVerseSet, updateSimilarVerseSet } from "@/lib/similar-verses/actions";
import {
  defaultSimilarVerseHighlightLayers,
  getSimilarVerseHighlightLayer,
  type SimilarVerseHighlightLayer,
} from "@/lib/similar-verses/highlight-layers";
import {
  type SimilarVerseDraftItem,
  type SimilarVerseHighlightType,
} from "@/lib/similar-verses/types";
import { type Surah } from "@/lib/quran/types";
import { cn } from "@/lib/utils";

type LocalHighlight = {
  color?: string | null;
  id: string;
  verseKey: string;
  startWordPosition: number;
  endWordPosition: number;
  label?: string | null;
  type: SimilarVerseHighlightType;
  note?: string;
};

type SimilarVersesEditorProps = {
  editRecordId?: string;
  initialFamilyTitle?: string;
  initialHighlights?: LocalHighlight[];
  initialNote?: string;
  initialTitle?: string;
  initialVerse?: SimilarVerseDraftItem | null;
  initialVerses?: SimilarVerseDraftItem[];
  surahs: Surah[];
};

export function SimilarVersesEditor({
  editRecordId,
  initialFamilyTitle = "",
  initialHighlights = [],
  initialNote = "",
  initialTitle = "",
  initialVerse,
  initialVerses,
  surahs,
}: SimilarVersesEditorProps) {
  const [items, setItems] = useState<SimilarVerseDraftItem[]>(
    initialVerses?.length ? initialVerses : initialVerse ? [initialVerse] : [],
  );
  const [title, setTitle] = useState(initialTitle);
  const familyTitle = initialFamilyTitle;
  const [comments, setComments] = useState<string[]>(() => parseComments(initialNote));
  const [commentDraft, setCommentDraft] = useState("");
  const [selectedSurahNumber, setSelectedSurahNumber] = useState(
    initialVerse?.surahNumber ?? 1,
  );
  const [selectedAyahNumber, setSelectedAyahNumber] = useState(
    initialVerse?.ayahNumber ?? 1,
  );
  const [preview, setPreview] = useState<SimilarVerseDraftItem | null>(initialVerse ?? null);
  const [message, setMessage] = useState("");
  const [selectedWord, setSelectedWord] = useState<{
    verseKey: string;
    wordPosition: number;
  } | null>(null);
  const [pendingRange, setPendingRange] = useState<{
    endWordPosition: number;
    startWordPosition: number;
    verseKey: string;
  } | null>(null);
  const [highlights, setHighlights] = useState<LocalHighlight[]>(initialHighlights);
  const [isPending, startTransition] = useTransition();
  const selectedSurah = surahs.find((surah) => surah.number === selectedSurahNumber);

  const highlightLayers = defaultSimilarVerseHighlightLayers;

  useEffect(() => {
    const controller = new AbortController();

    async function loadPreview() {
      setPreview(null);
      setMessage("");

      try {
        const response = await fetch(
          `/api/quran/verse/${selectedSurahNumber}/${selectedAyahNumber}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setPreview(null);
          return;
        }

        const payload = (await response.json()) as {
          verse: SimilarVerseDraftItem | null;
        };
        setPreview(payload.verse);
      } catch {
        if (!controller.signal.aborted) {
          setPreview(null);
        }
      }
    }

    void loadPreview();

    return () => controller.abort();
  }, [selectedAyahNumber, selectedSurahNumber]);

  const ayahOptions = useMemo(
    () =>
      Array.from({ length: selectedSurah?.ayahCount ?? 1 }, (_, index) => index + 1),
    [selectedSurah?.ayahCount],
  );

  function addPreview() {
    if (!preview) {
      setMessage("Choose a valid ayah first.");
      return;
    }

    if (items.some((item) => item.verseKey === preview.verseKey)) {
      setMessage("That ayah is already attached.");
      return;
    }

    setItems((currentItems) => [...currentItems, preview]);
    setMessage("");
  }

  function removeItem(verseKey: string) {
    setItems((currentItems) => currentItems.filter((item) => item.verseKey !== verseKey));
    setHighlights((currentHighlights) =>
      currentHighlights.filter((highlight) => highlight.verseKey !== verseKey),
    );
    setSelectedWord(null);
    setPendingRange(null);
  }

  function selectWord(verseKey: string, wordPosition: number) {
    if (selectedWord?.verseKey === verseKey) {
      setPendingRange({
        endWordPosition: Math.max(selectedWord.wordPosition, wordPosition),
        startWordPosition: Math.min(selectedWord.wordPosition, wordPosition),
        verseKey,
      });
      setSelectedWord(null);
      return;
    }

    setSelectedWord({ verseKey, wordPosition });
    setPendingRange(null);
  }

  function applyHighlight(layer: SimilarVerseHighlightLayer) {
    if (!pendingRange) {
      setMessage("Tap a start word and an end word first.");
      return;
    }

    setHighlights((currentHighlights) => [
      ...currentHighlights,
      {
        ...pendingRange,
        id: createLocalId(),
        color: layer.color,
        label: layer.name,
        type: layer.id,
      },
    ]);
    setPendingRange(null);
    setMessage("");
  }

  function saveRecord() {
    startTransition(async () => {
      const payload = {
        familyTitle,
        title,
        note: serializeComments(comments),
        items: items.map((item) => ({
          ayahNumber: item.ayahNumber,
          pageNumber: item.pageNumber,
          surahNumber: item.surahNumber,
          verseKey: item.verseKey,
        })),
        highlights: highlights.map((highlight) => {
          const layer = getSimilarVerseHighlightLayer(highlightLayers, highlight.type);

          return {
            ...highlight,
            color: highlight.color ?? layer.color,
            label: highlight.label ?? layer.name,
          };
        }),
      };
      const result = editRecordId
        ? await updateSimilarVerseSet(editRecordId, payload)
        : await createSimilarVerseSet(payload);

      if (result.ok && result.id) {
        window.location.href = "/app/library/similar-verses";
        return;
      }

      setMessage(result.message);
    });
  }

  const isPreviewAdded = Boolean(
    preview && items.some((item) => item.verseKey === preview.verseKey),
  );

  return (
    <div className="space-y-5 pb-24">
      <div className="flex items-center justify-between gap-3">
        <Link
          className="inline-flex size-11 items-center justify-center rounded-2xl border border-line bg-paper text-ink/70 shadow-soft"
          href="/app/library/similar-verses"
        >
          <ArrowLeft aria-hidden className="size-5" />
          <span className="sr-only">Back to similar verses</span>
        </Link>
        <span className="rounded-full bg-paper px-3 py-2 text-xs font-bold text-ink/45 shadow-soft">
          {editRecordId ? "Editing" : "Draft"}
        </span>
      </div>

      <section className="space-y-3 rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft">
        <input
          aria-label="Record title"
          className="h-12 w-full border-none bg-transparent px-0 text-2xl font-extrabold text-ink outline-none placeholder:text-ink/30"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Record Title"
          value={title}
        />
      </section>

      <section className="space-y-3 rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Add Āyāt</h2>
        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <label className="block">
            <span className="sr-only">Surah</span>
            <select
              className="h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
              onChange={(event) => {
                const nextSurahNumber = Number(event.target.value);
                const nextSurah = surahs.find((surah) => surah.number === nextSurahNumber);
                setSelectedSurahNumber(nextSurahNumber);
                setSelectedAyahNumber((ayahNumber) =>
                  Math.min(ayahNumber, nextSurah?.ayahCount ?? 1),
                );
              }}
              value={selectedSurahNumber}
            >
              {surahs.map((surah) => (
                <option key={surah.number} value={surah.number}>
                  {surah.number}. {surah.transliteratedName}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Ayah</span>
            <select
              className="h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
              onChange={(event) => setSelectedAyahNumber(Number(event.target.value))}
              value={selectedAyahNumber}
            >
              {ayahOptions.map((ayahNumber) => (
                <option key={ayahNumber} value={ayahNumber}>
                  {ayahNumber}
                </option>
              ))}
            </select>
          </label>
        </div>
        {preview ? (
          <div className="rounded-3xl bg-palm/5 px-4 py-3 text-right text-xl leading-10 text-ink" dir="rtl" lang="ar">
            {preview.text}
          </div>
        ) : (
          <div className="rounded-3xl bg-mist px-4 py-6 text-center text-sm font-semibold text-ink/50">
            Loading ayah preview...
          </div>
        )}
        <button
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition disabled:opacity-80",
            isPreviewAdded ? "bg-palm/10 text-palm" : "bg-ink text-white",
          )}
          disabled={!preview || isPreviewAdded}
          onClick={addPreview}
          type="button"
        >
          {isPreviewAdded ? <Check aria-hidden className="size-4" /> : <Plus aria-hidden className="size-4" />}
          {isPreviewAdded ? "Added" : "Add ayah"}
        </button>
        {items.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {items.map((item) => (
              <button
                className="inline-flex items-center gap-1.5 rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink/60"
                key={item.verseKey}
                onClick={() => removeItem(item.verseKey)}
                type="button"
              >
                {item.verseKey}
                <Trash2 aria-hidden className="size-3" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">Highlight editor</h2>
          </div>
          <span className="rounded-full border border-palm/15 bg-palm/8 px-3 py-1.5 text-xs font-extrabold text-palm">
            {items.length} āyāt attached
          </span>
        </div>

        {items.length ? (
          <div className="grid gap-4">
            {items.map((item) => (
              <article
                className="rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft"
                key={item.verseKey}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-palm">
                      {item.verseKey}
                    </p>
                    <h3 className="text-base font-extrabold text-ink">
                      {surahs.find((surah) => surah.number === item.surahNumber)?.transliteratedName}
                    </h3>
                  </div>
                  <button
                    aria-label="Remove ayah"
                    className="flex size-9 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeItem(item.verseKey)}
                    type="button"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
                <div
                  className="rounded-3xl bg-palm/5 px-3 py-4 text-right text-2xl leading-[2.9rem] text-ink"
                  dir="rtl"
                  lang="ar"
                >
                  <WordBlockRenderer
                    highlightLayers={highlightLayers}
                    highlights={highlights}
                    onSelectWord={selectWord}
                    pendingRange={pendingRange}
                    selectedWord={selectedWord}
                    verseKey={item.verseKey}
                    words={item.words}
                  />
                </div>
                {pendingRange?.verseKey === item.verseKey ? (
                  <div className="mt-3 rounded-3xl border border-line bg-mist/60 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-palm">Apply highlight</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {highlightLayers.map((layer) => (
                        <button
                          className="min-h-11 rounded-2xl px-2 text-xs font-extrabold text-ink ring-1 ring-ink/10"
                          key={layer.id}
                          onClick={() => applyHighlight(layer)}
                          style={{ backgroundColor: layer.color }}
                          type="button"
                        >
                          {layer.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {highlights.some((highlight) => highlight.verseKey === item.verseKey) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {highlights
                      .filter((highlight) => highlight.verseKey === item.verseKey)
                      .map((highlight) => (
                        <button
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-ink/10"
                          key={highlight.id}
                          onClick={() =>
                            setHighlights((currentHighlights) =>
                              currentHighlights.filter((current) => current.id !== highlight.id),
                            )
                          }
                          style={{
                            backgroundColor:
                              highlight.color ??
                              getSimilarVerseHighlightLayer(highlightLayers, highlight.type).color,
                          }}
                          type="button"
                        >
                          {getHighlightLabel(highlightLayers, highlight)}
                          <X aria-hidden className="size-3.5" />
                        </button>
                      ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-dashed border-line bg-paper px-5 py-8 text-center shadow-soft">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-palm/10 text-palm">
              <Check aria-hidden className="size-7" />
            </div>
            <p className="mt-4 text-base font-extrabold text-ink">No ayat attached yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
              Add two or more ayat that you mix up, then mark what is shared and what changes.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-[1.6rem] border border-line bg-paper p-4 shadow-soft">
        <h2 className="text-base font-extrabold text-ink">Record comments</h2>
        {comments.length ? (
          <div className="grid gap-2">
            {comments.map((comment, index) => (
              <div
                className="flex items-start gap-2 rounded-2xl bg-mist px-3 py-2 text-sm leading-6 text-ink/75"
                key={`${comment}-${index}`}
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-palm" />
                <p className="min-w-0 flex-1">{comment}</p>
                <button
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-ink/40"
                  onClick={() =>
                    setComments((currentComments) =>
                      currentComments.filter((_, commentIndex) => commentIndex !== index),
                    )
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <textarea
          className="min-h-24 w-full resize-none rounded-2xl border border-line bg-mist px-4 py-3 text-sm leading-6 text-ink outline-none placeholder:text-ink/35 focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
          onChange={(event) => setCommentDraft(event.target.value)}
          placeholder="Add a memory note or distinction"
          value={commentDraft}
        />
        <button
          className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-ink px-4 text-sm font-extrabold text-white transition disabled:opacity-50"
          disabled={!commentDraft.trim()}
          onClick={() => {
            setComments((currentComments) => [...currentComments, commentDraft.trim()]);
            setCommentDraft("");
          }}
          type="button"
        >
          Add comment
        </button>
      </section>

      {message ? (
        <div className="rounded-2xl bg-ink px-4 py-3 text-center text-sm font-bold text-white">
          {message}
        </div>
      ) : null}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pb-[max(env(safe-area-inset-bottom),0.85rem)] pt-3 shadow-[0_-12px_40px_rgba(31,39,33,0.12)] backdrop-blur">
        <button
          className="mx-auto flex min-h-12 w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-palm px-4 text-sm font-extrabold text-white shadow-soft transition disabled:opacity-50"
          disabled={isPending || items.length === 0}
          onClick={saveRecord}
          type="button"
        >
          {isPending ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function parseComments(value: string) {
  if (!value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as { comments?: string[]; kind?: string };

    if (parsed.kind === "mutqin-comments-v1" && Array.isArray(parsed.comments)) {
      return parsed.comments.filter((comment) => comment.trim());
    }
  } catch {
    // Older records used a plain text note.
  }

  return [value];
}

function serializeComments(comments: string[]) {
  const cleaned = comments.map((comment) => comment.trim()).filter(Boolean);

  return cleaned.length
    ? JSON.stringify({ comments: cleaned, kind: "mutqin-comments-v1" })
    : "";
}

function getHighlightLabel(
  layers: SimilarVerseHighlightLayer[],
  highlight: Pick<LocalHighlight, "label" | "type">,
) {
  return highlight.label ?? getSimilarVerseHighlightLayer(layers, highlight.type).name;
}

function WordBlockRenderer({
  highlights,
  onSelectWord,
  pendingRange,
  selectedWord,
  verseKey,
  words,
  highlightLayers,
}: {
  highlights: LocalHighlight[];
  highlightLayers: SimilarVerseHighlightLayer[];
  onSelectWord: (verseKey: string, wordPosition: number) => void;
  pendingRange: { endWordPosition: number; startWordPosition: number; verseKey: string } | null;
  selectedWord: { verseKey: string; wordPosition: number } | null;
  verseKey: string;
  words: SimilarVerseDraftItem["words"];
}) {
  const chunks = buildWordChunks(words, highlights, verseKey, selectedWord, pendingRange);

  return (
    <>
      {chunks.map((chunk, index) => (
        <span
          className={cn(
            "mx-0.5 rounded-xl px-1.5 py-1 ring-1 ring-transparent",
            chunk.kind === "temporary" && "bg-ink text-white",
            chunk.kind === "highlight" && "ring-ink/10",
          )}
          style={
            chunk.kind === "highlight" && chunk.highlight
              ? {
                  backgroundColor:
                    chunk.highlight.color ??
                    getSimilarVerseHighlightLayer(highlightLayers, chunk.highlight.type).color,
                }
              : undefined
          }
          key={`${chunk.kind}-${index}-${chunk.words[0]?.wordPosition}`}
        >
          {chunk.words.map((word) => (
            <button
              className="mx-0.5 rounded-md px-0.5 transition"
              key={`${verseKey}-${word.wordPosition}`}
              onClick={() => onSelectWord(verseKey, word.wordPosition)}
              type="button"
            >
              {word.text}
            </button>
          ))}
        </span>
      ))}
    </>
  );
}

function buildWordChunks(
  words: SimilarVerseDraftItem["words"],
  highlights: LocalHighlight[],
  verseKey: string,
  selectedWord: { verseKey: string; wordPosition: number } | null,
  pendingRange: { endWordPosition: number; startWordPosition: number; verseKey: string } | null,
) {
  const chunks: Array<{
    highlight?: LocalHighlight;
    kind: "plain" | "highlight" | "temporary";
    words: SimilarVerseDraftItem["words"];
  }> = [];

  for (const word of words) {
    const tempSelected = isWordTemporarilySelected(
      selectedWord,
      pendingRange,
      verseKey,
      word.wordPosition,
    );
    const highlight = getWordHighlight(highlights, verseKey, word.wordPosition);
    const kind = tempSelected ? "temporary" : highlight ? "highlight" : "plain";
    const previous = chunks[chunks.length - 1];

    if (
      previous &&
      previous.kind === kind &&
      previous.highlight?.id === highlight?.id
    ) {
      previous.words.push(word);
    } else {
      chunks.push({
        highlight,
        kind,
        words: [word],
      });
    }
  }

  return chunks;
}

function isWordTemporarilySelected(
  selectedWord: { verseKey: string; wordPosition: number } | null,
  pendingRange: { endWordPosition: number; startWordPosition: number; verseKey: string } | null,
  verseKey: string,
  wordPosition: number,
) {
  if (pendingRange?.verseKey === verseKey) {
    return (
      wordPosition >= pendingRange.startWordPosition &&
      wordPosition <= pendingRange.endWordPosition
    );
  }

  return selectedWord?.verseKey === verseKey && selectedWord.wordPosition === wordPosition;
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWordHighlight(
  highlights: LocalHighlight[],
  verseKey: string,
  wordPosition: number,
) {
  return highlights.find(
    (highlight) =>
      highlight.verseKey === verseKey &&
      wordPosition >= highlight.startWordPosition &&
      wordPosition <= highlight.endWordPosition,
  );
}
