"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { type ChangeEvent, type MouseEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { type NormalizedHadith } from "@/lib/hadith/types";
import {
  type CollectionItemKind,
  type DuaEntryInput,
  type LibraryActionResult,
  type LibraryItem,
  type TextMarkerInput,
  type TextMarkerType,
} from "@/lib/library/types";
import {
  getBooleanMeta,
  getCollectionHref,
  getDuaEntries,
  getStringMeta,
  getTags,
  getTextMarkers,
} from "./collection-utils";
import { cn } from "@/lib/utils";

type CollectionFormProps = {
  item?: LibraryItem | null;
  type: CollectionItemKind;
};

type MarkerTarget = "arabic" | "translation";

type ClearableFieldProps = {
  className: string;
  dir?: "ltr" | "rtl";
  label: string;
  lang?: string;
  multiline?: boolean;
  onChange(value: string): void;
  placeholder?: string;
  value: string;
};

const markerOptions: Array<{ label: string; type: TextMarkerType }> = [
  { label: "Sanad", type: "sanad" },
  { label: "Matn", type: "matn" },
  { label: "Quote", type: "quote" },
];

const markerStyles: Record<TextMarkerType, string> = {
  sanad: "bg-ink/10 ring-ink/15",
  matn: "bg-sky-100 ring-sky-200/80",
  quote: "bg-palm/18 ring-palm/25 text-palm",
};

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ClearableField({
  className,
  dir,
  label,
  lang,
  multiline,
  onChange,
  placeholder,
  value,
}: ClearableFieldProps) {
  const controlClassName = `${className} ${value ? (multiline ? "pr-10" : "pr-10") : ""}`;
  const sharedProps = {
    className: controlClassName,
    dir,
    lang,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    placeholder,
    value,
  };

  return (
    <label className="relative block">
      <span className="text-xs font-bold uppercase tracking-wide text-palm">{label}</span>
      {multiline ? <textarea {...sharedProps} /> : <input {...sharedProps} />}
      {value ? (
        <button
          aria-label={`Clear ${label}`}
          className="absolute right-3 top-9 flex size-6 items-center justify-center rounded-full bg-ink/10 text-ink/45 transition hover:bg-ink/15 hover:text-ink"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </label>
  );
}

export function CollectionForm({ item, type }: CollectionFormProps) {
  const router = useRouter();
  const baseHref = getCollectionHref(type);
  const isHadith = type === "hadith";
  const [title, setTitle] = useState(item?.title ?? "");
  const [arabicText, setArabicText] = useState(item ? getStringMeta(item, "arabicText") : "");
  const [arabicMarkers, setArabicMarkers] = useState<TextMarkerInput[]>(
    item ? getTextMarkers(item, "arabicMarkers") : [],
  );
  const [translation, setTranslation] = useState(item ? getStringMeta(item, "translation") : "");
  const [translationMarkers, setTranslationMarkers] = useState<TextMarkerInput[]>(
    item ? getTextMarkers(item, "translationMarkers") : [],
  );
  const transliteration = item ? getStringMeta(item, "transliteration") : "";
  const [source, setSource] = useState(item ? getStringMeta(item, "source") : "");
  const [reference, setReference] = useState(item ? getStringMeta(item, "reference") : "");
  const [category, setCategory] = useState(item ? getStringMeta(item, "category") : "");
  const [narrator, setNarrator] = useState(item ? getStringMeta(item, "narrator") : "");
  const [grade, setGrade] = useState(item ? getStringMeta(item, "grade") : "");
  const [book, setBook] = useState(item ? getStringMeta(item, "book") : "");
  const [chapter, setChapter] = useState(item ? getStringMeta(item, "chapter") : "");
  const [provider, setProvider] = useState(item ? getStringMeta(item, "provider") : "");
  const [providerHadithId, setProviderHadithId] = useState(
    item ? getStringMeta(item, "providerHadithId") : "",
  );
  const [sourceUrl, setSourceUrl] = useState(item ? getStringMeta(item, "sourceUrl") : "");
  const [tags, setTags] = useState(item ? getTags(item).join(", ") : "");
  const [body, setBody] = useState(item?.body ?? "");
  const [duaEntries, setDuaEntries] = useState<DuaEntryInput[]>(
    item ? getDuaEntries(item) : [],
  );
  const [reflectionOpen, setReflectionOpen] = useState(Boolean(item?.body));
  const [pinned, setPinned] = useState(item ? getBooleanMeta(item, "pinned") : false);
  const [message, setMessage] = useState<string | null>(null);
  const [lookupReference, setLookupReference] = useState("");
  const [lookupResult, setLookupResult] = useState<NormalizedHadith | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [isMarkerSheetOpen, setIsMarkerSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const labels = useMemo(
    () =>
      isHadith
        ? {
            title: "Topic",
            source: "Collection",
            reference: "Reference",
            body: "Reflection",
            save: item ? "Save Hadith" : "Add Hadith",
          }
        : {
            title: "Title",
            source: "Source",
            reference: "Reference",
            body: "Personal note",
            save: item ? "Save Dua" : "Add Dua",
          },
    [isHadith, item],
  );
  const isWitrDua = !isHadith && splitTags(tags).some((tag) => tag.toLowerCase() === "witr");
  const showDuaCompiler = !isHadith && (isWitrDua || duaEntries.length > 0);

  function appendCurrentDua() {
    if (!arabicText.trim()) {
      setMessage("Add Arabic text before appending to the Witr record.");
      return;
    }

    setDuaEntries((current) => [
      ...current,
      {
        id: createLocalId(),
        arabicText: arabicText.trim(),
        translation: translation.trim() || null,
        source: source.trim() || null,
        reference: reference.trim() || null,
      },
    ]);
    setArabicText("");
    setTranslation("");
    setSource("");
    setReference("");
    setMessage(null);
  }

  function moveDuaEntry(index: number, direction: -1 | 1) {
    setDuaEntries((current) => {
      const nextIndex = index + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [entry] = next.splice(index, 1);
      next.splice(nextIndex, 0, entry);

      return next;
    });
  }

  function removeDuaEntry(entryId: string) {
    setDuaEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  async function lookupHadith() {
    const trimmedReference = lookupReference.trim();

    if (!trimmedReference) {
      setLookupMessage("Type a reference first.");
      return;
    }

    setIsLookupLoading(true);
    setLookupMessage(null);
    setLookupResult(null);

    try {
      const response = await fetch(
        `/api/hadith/lookup?reference=${encodeURIComponent(trimmedReference)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        correctedReference?: string;
        hadith?: NormalizedHadith;
        message?: string;
        ok?: boolean;
      };

      if (!response.ok || !payload.ok || !payload.hadith) {
        setLookupMessage(payload.message ?? "Hadith lookup failed. You can still enter it manually.");
        return;
      }

      const hadith = payload.hadith;
      setLookupResult(hadith);
      setArabicText(hadith.arabicText ?? "");
      setArabicMarkers([]);
      setTranslation(hadith.englishText ?? "");
      setTranslationMarkers([]);
      setSource(hadith.collection);
      setReference(hadith.reference);
      setNarrator(hadith.narrator ?? "");
      setGrade(hadith.grade ?? "");
      setBook(hadith.book ?? "");
      setChapter(hadith.chapter ?? "");
      setProvider(hadith.provider);
      setProviderHadithId(hadith.providerHadithId ?? "");
      setSourceUrl(hadith.sourceUrl ?? "");
      setTitle((current) => current.trim() || hadith.reference);
      setLookupMessage(
        payload.correctedReference
          ? `Matched as ${payload.correctedReference} and added to the form.`
          : "Hadith found and added to the form.",
      );
    } catch {
      setLookupMessage("Hadith lookup failed. You can still enter it manually.");
    } finally {
      setIsLookupLoading(false);
    }
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const fallbackTitle =
        title.trim() || reference.trim() || source.trim() || (isHadith ? "Hadith" : "Dua");
      const payload = {
        id: item?.id,
        type,
        title: fallbackTitle,
        arabicText,
        arabicMarkers,
        translation,
        translationMarkers,
        transliteration: isHadith ? transliteration : "",
        duaEntries,
        source,
        reference,
        category,
        collection: source,
        narrator,
        grade,
        book,
        chapter,
        provider,
        providerHadithId,
        sourceUrl,
        tags: splitTags(tags),
        body,
        pinned,
      };
      const response = await fetch(
        item?.id ? `/api/library/collections/${item.id}` : "/api/library/collections",
        {
          body: JSON.stringify(payload),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: item?.id ? "PATCH" : "POST",
        },
      );
      const result = (await response.json()) as LibraryActionResult;

      if (!response.ok || !result.ok || !result.id) {
        setMessage(result.message);
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
      router.push(`${baseHref}/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {isHadith && !item ? (
        <section className="rounded-[1.45rem] border border-palm/15 bg-palm/5 p-4 shadow-soft">
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-extrabold text-ink">Import by reference</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-ink/55">
                Try Bukhari 1, Muslim 1907, Tirmidhi 2516, Abu Dawud, Nasai, or Ibn Majah.
              </p>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <label className="block min-w-0">
                <span className="sr-only">Hadith reference</span>
                <input
                  className="h-12 w-full rounded-2xl border border-line bg-paper px-3 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                  onChange={(event) => setLookupReference(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void lookupHadith();
                    }
                  }}
                  placeholder="Bukhari 1"
                  value={lookupReference}
                />
              </label>
              <button
                className="h-12 rounded-2xl bg-palm px-4 text-sm font-extrabold text-paper shadow-soft transition hover:bg-palm/90 disabled:opacity-60"
                disabled={isLookupLoading}
                onClick={() => void lookupHadith()}
                type="button"
              >
                {isLookupLoading ? "Fetching" : "Fetch"}
              </button>
            </div>
            {lookupMessage ? (
              <div className="rounded-2xl border border-line bg-paper px-3 py-2 text-xs font-bold text-ink/65">
                {lookupMessage}
              </div>
            ) : null}
            {lookupResult ? (
              <div className="rounded-[1.2rem] border border-line bg-paper p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wide text-palm">
                      {lookupResult.reference}
                    </p>
                    {[lookupResult.narrator, lookupResult.grade, lookupResult.chapter]
                      .filter(Boolean)
                      .join(" · ") ? (
                      <p className="mt-1 text-xs font-semibold leading-5 text-ink/50">
                        {[lookupResult.narrator, lookupResult.grade, lookupResult.chapter]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded-full bg-palm/10 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-palm">
                    {lookupResult.provider}
                  </span>
                </div>
                {lookupResult.arabicText ? (
                  <p
                    className="mt-3 rounded-2xl bg-mist px-3 py-3 text-right text-lg font-semibold leading-9 text-ink"
                    dir="rtl"
                    lang="ar"
                  >
                    {lookupResult.arabicText}
                  </p>
                ) : null}
                {lookupResult.englishText ? (
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-ink/68">
                    {lookupResult.englishText}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <div className="grid gap-3">
          <ClearableField
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            label={labels.title}
            onChange={setTitle}
            placeholder={isHadith ? "Actions are by intentions" : "Morning protection"}
            value={title}
          />
          <label className="relative block">
            <span className="text-xs font-bold uppercase tracking-wide text-palm">Arabic</span>
            <textarea
              className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-line bg-mist px-3 py-3 pr-10 text-right text-xl font-semibold leading-9 text-ink outline-none placeholder:text-ink/30 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
              dir="rtl"
              lang="ar"
              onChange={(event) => {
                setArabicText(event.target.value);
                setArabicMarkers([]);
              }}
              placeholder="النص العربي"
              value={arabicText}
            />
            {arabicText ? (
              <button
                aria-label="Clear Arabic"
                className="absolute right-3 top-9 flex size-6 items-center justify-center rounded-full bg-ink/10 text-ink/45 transition hover:bg-ink/15 hover:text-ink"
                onClick={() => {
                  setArabicText("");
                  setArabicMarkers([]);
                }}
                type="button"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            ) : null}
          </label>
          <ClearableField
            className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-line bg-mist px-3 py-3 text-sm leading-6 text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            label="Translation"
            multiline
            onChange={(value) => {
              setTranslation(value);
              setTranslationMarkers([]);
            }}
            placeholder="Meaning in English"
            value={translation}
          />
          {isHadith ? (
            <button
              className="rounded-2xl border border-palm/20 bg-palm/5 px-4 py-3 text-left text-sm font-extrabold text-palm"
              onClick={() => setIsMarkerSheetOpen(true)}
              type="button"
            >
              Add markers
              <span className="mt-1 block text-xs font-semibold text-ink/45">
                {arabicMarkers.length + translationMarkers.length
                  ? `${arabicMarkers.length + translationMarkers.length} markers saved in draft`
                  : "Mark sanad, matn, and quotes from the full text view"}
              </span>
            </button>
          ) : null}
          {showDuaCompiler ? (
            <div className="rounded-[1.25rem] border border-palm/15 bg-palm/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-ink">Witr dua sections</p>
                  <p className="mt-0.5 text-xs font-semibold text-ink/45">
                    Append, reorder, and remove sections for one long Witr record.
                  </p>
                </div>
                <button
                  className="shrink-0 rounded-2xl bg-palm px-3 py-2 text-xs font-extrabold text-paper"
                  onClick={appendCurrentDua}
                  type="button"
                >
                  Append
                </button>
              </div>
              {duaEntries.length ? (
                <div className="mt-3 grid gap-2">
                  {duaEntries.map((entry, index) => (
                    <div className="rounded-2xl border border-line bg-paper p-3" key={entry.id}>
                      <p className="text-xs font-bold uppercase tracking-wide text-palm">
                        Section {index + 1}
                      </p>
                      <p className="mt-2 text-right text-lg leading-8 text-ink" dir="rtl" lang="ar">
                        {entry.arabicText}
                      </p>
                      {entry.translation ? (
                        <p className="mt-2 text-sm leading-6 text-ink/60">
                          {entry.translation}
                        </p>
                      ) : null}
                      <div className="mt-3 flex gap-2">
                        <button
                          className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink/55 disabled:opacity-40"
                          disabled={index === 0}
                          onClick={() => moveDuaEntry(index, -1)}
                          type="button"
                        >
                          Up
                        </button>
                        <button
                          className="rounded-full bg-mist px-3 py-1.5 text-xs font-bold text-ink/55 disabled:opacity-40"
                          disabled={index === duaEntries.length - 1}
                          onClick={() => moveDuaEntry(index, 1)}
                          type="button"
                        >
                          Down
                        </button>
                        <button
                          className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600"
                          onClick={() => removeDuaEntry(entry.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <ClearableField
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
              label={labels.source}
              onChange={setSource}
              placeholder={isHadith ? "Bukhari" : "Hisn al-Muslim"}
              value={source}
            />
            <ClearableField
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
              label={labels.reference}
              onChange={setReference}
              placeholder={isHadith ? "Sahih al-Bukhari 1" : "Reference"}
              value={reference}
            />
          </div>
          {isHadith ? (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <ClearableField
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                  label="Narrator"
                  onChange={setNarrator}
                  placeholder="Umar ibn al-Khattab"
                  value={narrator}
                />
                <ClearableField
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                  label="Grade"
                  onChange={setGrade}
                  placeholder="Sahih"
                  value={grade}
                />
              </div>
              <ClearableField
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                label="Book"
                onChange={setBook}
                placeholder="Book name"
                value={book}
              />
              <ClearableField
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                label="Chapter"
                onChange={setChapter}
                placeholder="Chapter"
                value={chapter}
              />
            </div>
          ) : (
            <ClearableField
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
              label="Category"
              onChange={setCategory}
              placeholder="Morning, salah, protection"
              value={category}
            />
          )}
          <ClearableField
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            label="Tags"
            onChange={setTags}
            placeholder="Comma separated"
            value={tags}
          />
          <label className="flex items-center justify-between rounded-2xl bg-mist px-3 py-3">
            <span className="text-sm font-bold text-ink">Favorite</span>
            <input
              checked={pinned}
              className="size-5 accent-palm"
              onChange={(event) => setPinned(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>
      </section>

      {reflectionOpen ? (
        <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
          <ClearableField
            className="mt-2 min-h-28 w-full resize-none rounded-2xl border border-line bg-mist px-3 py-3 text-sm leading-6 text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            label={labels.body}
            multiline
            onChange={setBody}
            placeholder="Your notes"
            value={body}
          />
        </section>
      ) : (
        <button
          className="w-full rounded-2xl border border-dashed border-palm/25 bg-palm/5 px-4 py-3 text-sm font-extrabold text-palm"
          onClick={() => setReflectionOpen(true)}
          type="button"
        >
          Add reflection
        </button>
      )}

      {message ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      ) : null}

      <button
        className="h-12 w-full rounded-2xl bg-palm text-sm font-extrabold text-paper shadow-soft transition hover:bg-palm/90 disabled:opacity-60"
        disabled={isPending}
        onClick={save}
        type="button"
      >
        {labels.save}
      </button>
      {isMarkerSheetOpen ? (
        <HadithMarkerSheet
          arabicMarkers={arabicMarkers}
          arabicText={arabicText}
          onClose={() => setIsMarkerSheetOpen(false)}
          onSave={(nextArabicMarkers, nextTranslationMarkers) => {
            setArabicMarkers(nextArabicMarkers);
            setTranslationMarkers(nextTranslationMarkers);
            setIsMarkerSheetOpen(false);
          }}
          translationMarkers={translationMarkers}
          translationText={translation}
        />
      ) : null}
    </div>
  );
}

function createMarkerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

function HadithMarkerSheet({
  arabicMarkers,
  arabicText,
  onClose,
  onSave,
  translationMarkers,
  translationText,
}: {
  arabicMarkers: TextMarkerInput[];
  arabicText: string;
  onClose(): void;
  onSave(arabicMarkers: TextMarkerInput[], translationMarkers: TextMarkerInput[]): void;
  translationMarkers: TextMarkerInput[];
  translationText: string;
}) {
  const [draftArabicMarkers, setDraftArabicMarkers] = useState(arabicMarkers);
  const [draftTranslationMarkers, setDraftTranslationMarkers] = useState(translationMarkers);
  const [selectedRange, setSelectedRange] = useState<{
    endWordPosition: number;
    startWordPosition: number;
    target: MarkerTarget;
  } | null>(null);
  const [selectedWord, setSelectedWord] = useState<{
    target: MarkerTarget;
    wordPosition: number;
  } | null>(null);

  function getTargetMarkers(target: MarkerTarget) {
    return target === "arabic" ? draftArabicMarkers : draftTranslationMarkers;
  }

  function setTargetMarkers(target: MarkerTarget, markers: TextMarkerInput[]) {
    if (target === "arabic") {
      setDraftArabicMarkers(markers);
    } else {
      setDraftTranslationMarkers(markers);
    }
  }

  const [selectionAnchor, setSelectionAnchor] = useState<{ x: number; y: number } | null>(null);

  function selectWord(target: MarkerTarget, wordPosition: number, event: MouseEvent) {
    const viewportPadding = 12;
    const barHalfWidth = 136;
    const x = Math.min(
      Math.max(event.clientX, barHalfWidth + viewportPadding),
      window.innerWidth - barHalfWidth - viewportPadding,
    );
    const y = Math.min(Math.max(event.clientY, 88), window.innerHeight - 96);

    if (selectedWord?.target === target) {
      setSelectedRange({
        endWordPosition: Math.max(selectedWord.wordPosition, wordPosition),
        startWordPosition: Math.min(selectedWord.wordPosition, wordPosition),
        target,
      });
      setSelectedWord(null);
      setSelectionAnchor({ x, y });
      return;
    }

    setSelectedWord({ target, wordPosition });
    setSelectedRange(null);
    setSelectionAnchor({ x, y });
  }

  function applyMarker(type: TextMarkerType) {
    if (!selectedRange) return;

    const currentMarkers = getTargetMarkers(selectedRange.target);
    setTargetMarkers(selectedRange.target, [
      ...currentMarkers,
      {
        id: createMarkerId(),
        endWordPosition: selectedRange.endWordPosition,
        startWordPosition: selectedRange.startWordPosition,
        type,
      },
    ]);
    setSelectedRange(null);
    setSelectionAnchor(null);
  }

  function removeMarker(target: MarkerTarget, markerId: string) {
    setTargetMarkers(
      target,
      getTargetMarkers(target).filter((marker) => marker.id !== markerId),
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/35 px-3 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-[1.7rem] bg-mist shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-3">
          <button className="text-sm font-extrabold text-palm" onClick={onClose} type="button">
            Close
          </button>
          <h2 className="text-sm font-extrabold text-ink">Hadith markers</h2>
          <button
            className="text-sm font-extrabold text-palm"
            onClick={() => onSave(draftArabicMarkers, draftTranslationMarkers)}
            type="button"
          >
            Save
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-bold text-ink/55">
            {markerOptions.map((option) => (
              <span
                className={`rounded-full px-3 py-1.5 ring-1 ${markerStyles[option.type]}`}
                key={option.type}
              >
                {option.label}
              </span>
            ))}
          </div>
          <MarkerTextBlock
            dir="rtl"
            label="Arabic"
            markers={draftArabicMarkers}
            onRemoveMarker={(markerId) => removeMarker("arabic", markerId)}
            onSelectWord={(wordPosition, event) => selectWord("arabic", wordPosition, event)}
            selectedRange={selectedRange?.target === "arabic" ? selectedRange : null}
            selectedWord={selectedWord?.target === "arabic" ? selectedWord.wordPosition : null}
            target="arabic"
            text={arabicText}
          />
          <MarkerTextBlock
            label="English"
            markers={draftTranslationMarkers}
            onRemoveMarker={(markerId) => removeMarker("translation", markerId)}
            onSelectWord={(wordPosition, event) => selectWord("translation", wordPosition, event)}
            selectedRange={selectedRange?.target === "translation" ? selectedRange : null}
            selectedWord={
              selectedWord?.target === "translation" ? selectedWord.wordPosition : null
            }
            target="translation"
            text={translationText}
          />
        </div>
        {selectedRange && selectionAnchor ? (
          <div
            className="fixed z-[60] flex -translate-x-1/2 flex-wrap justify-center gap-2 rounded-2xl border border-line bg-paper/95 px-3 py-2 shadow-2xl backdrop-blur"
            style={{ left: selectionAnchor.x, top: selectionAnchor.y + 14 }}
          >
            {markerOptions.map((option) => (
              <button
                className={`rounded-full px-4 py-2 text-xs font-extrabold ring-1 ${markerStyles[option.type]}`}
                key={option.type}
                onClick={() => applyMarker(option.type)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MarkerTextBlock({
  dir = "ltr",
  label,
  markers,
  onRemoveMarker,
  onSelectWord,
  selectedRange,
  selectedWord,
  text,
}: {
  dir?: "ltr" | "rtl";
  label: string;
  markers: TextMarkerInput[];
  onRemoveMarker(markerId: string): void;
  onSelectWord(wordPosition: number, event: MouseEvent): void;
  selectedRange: { endWordPosition: number; startWordPosition: number } | null;
  selectedWord: number | null;
  target: MarkerTarget;
  text: string;
}) {
  const words = splitWords(text);
  const chunks = buildMarkerChunks(words, markers, selectedRange, selectedWord);

  return (
    <section className="mb-5 rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-ink">{label}</h3>
        <span className="text-xs font-bold text-ink/40">{markers.length} markers</span>
      </div>
      {words.length ? (
        <p
          className={cn(
            "max-w-full select-none whitespace-normal break-words font-semibold text-ink [overflow-wrap:anywhere]",
            dir === "rtl"
              ? "text-right text-2xl leading-[2.35]"
              : "text-left text-base leading-8",
          )}
          dir={dir}
          lang={dir === "rtl" ? "ar" : undefined}
        >
          {chunks.map((chunk) => {
            return (
              <span key={chunk.key}>
                <span
                  className={cn(
                    "box-decoration-clone rounded-lg px-1.5 py-1",
                    chunk.isSelected
                      ? "bg-ink text-paper"
                      : chunk.markerType
                        ? markerStyles[chunk.markerType]
                        : "",
                  )}
                >
                  {chunk.words.map((word, index) => {
                    const wordPosition = chunk.startWordPosition + index;

                    return (
                      <span key={`${word}-${wordPosition}`}>
                        <button
                          className="inline bg-transparent px-0 transition hover:text-palm"
                          onClick={(event) => onSelectWord(wordPosition, event)}
                          type="button"
                        >
                          {word}
                        </button>
                        {index < chunk.words.length - 1 ? " " : ""}
                      </span>
                    );
                  })}
                </span>
                <span> </span>
              </span>
            );
          })}
        </p>
      ) : (
        <p className="text-sm font-semibold text-ink/45">No text yet.</p>
      )}
      {markers.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {markers.map((marker) => (
            <button
              className={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ${markerStyles[marker.type]}`}
              key={marker.id}
              onClick={() => onRemoveMarker(marker.id)}
              type="button"
            >
              {markerOptions.find((option) => option.type === marker.type)?.label} · tap to clear
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

type MarkerChunk = {
  isSelected: boolean;
  key: string;
  markerType: TextMarkerType | null;
  startWordPosition: number;
  words: string[];
};

function buildMarkerChunks(
  words: string[],
  markers: TextMarkerInput[],
  selectedRange: { endWordPosition: number; startWordPosition: number } | null,
  selectedWord: number | null,
) {
  const chunks: MarkerChunk[] = [];

  words.forEach((word, index) => {
    const wordPosition = index + 1;
    const marker = getMarkerForWord(markers, wordPosition);
    const isSelected =
      Boolean(selectedRange) &&
      wordPosition >= (selectedRange?.startWordPosition ?? 0) &&
      wordPosition <= (selectedRange?.endWordPosition ?? 0);
    const isStartWord = selectedWord === wordPosition;
    const markerType = marker?.type ?? null;
    const lastChunk = chunks[chunks.length - 1];

    if (
      lastChunk &&
      lastChunk.isSelected === (isSelected || isStartWord) &&
      lastChunk.markerType === markerType
    ) {
      lastChunk.words.push(word);
      return;
    }

    chunks.push({
      isSelected: isSelected || isStartWord,
      key: `${wordPosition}-${markerType ?? "plain"}-${isSelected ? "selected" : "normal"}`,
      markerType,
      startWordPosition: wordPosition,
      words: [word],
    });
  });

  return chunks;
}
