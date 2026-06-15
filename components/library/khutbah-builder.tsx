"use client";

import { useRouter } from "next/navigation";
import { BookOpen, ScrollText, X } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { type Surah } from "@/lib/quran/types";
import {
  type CollectionItemInput,
  type KhutbahReferenceInput,
  type LibraryActionResult,
  type LibraryItem,
} from "@/lib/library/types";
import { cn } from "@/lib/utils";
import {
  getKhutbahReferences,
  getStringMeta,
  getTags,
} from "./collection-utils";

type VerseSummary = {
  ayahNumber: number;
  pageNumber: number;
  surahNumber: number;
  text: string;
  verseKey: string;
};

type KhutbahBuilderProps = {
  existingTags?: string[];
  hadiths: LibraryItem[];
  item?: LibraryItem | null;
  pieces: LibraryItem[];
  surahs: Surah[];
  templates: LibraryItem[];
};

const kindLabels: Record<string, string> = {
  draft: "Draft",
  piece: "Preset piece",
  template: "Template",
};

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

function getKhutbahKind(item?: LibraryItem | null) {
  const kind = item ? getStringMeta(item, "khutbahKind") : "";

  return kind || "draft";
}

function buildReferenceLabel(reference: KhutbahReferenceInput) {
  return reference.reference ? `${reference.label} · ${reference.reference}` : reference.label;
}

export function KhutbahBuilder({
  existingTags = [],
  hadiths,
  item,
  pieces,
  surahs,
  templates,
}: KhutbahBuilderProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [title, setTitle] = useState(item?.title ?? "");
  const [body, setBody] = useState(item?.body ?? "");
  const [kind, setKind] = useState(getKhutbahKind(item));
  const [tags, setTags] = useState<string[]>(item ? getTags(item) : []);
  const [references, setReferences] = useState<KhutbahReferenceInput[]>(
    item ? getKhutbahReferences(item) : [],
  );
  const [isAyahSheetOpen, setIsAyahSheetOpen] = useState(false);
  const [isHadithSheetOpen, setIsHadithSheetOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function insertText(text: string, reference?: KhutbahReferenceInput) {
    const textarea = textareaRef.current;
    const insertion = body ? `\n\n${text}` : text;

    if (!textarea) {
      setBody((current) => `${current}${insertion}`);
    } else {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const prefix = body.slice(0, start);
      const suffix = body.slice(end);
      const separatorBefore = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
      const separatorAfter = suffix && !suffix.startsWith("\n") ? "\n\n" : "";
      const next = `${prefix}${separatorBefore}${text}${separatorAfter}${suffix}`;
      const nextCursor = `${prefix}${separatorBefore}${text}`.length;
      setBody(next);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
    }

    if (reference) {
      setReferences((current) => [...current, reference]);
    }
  }

  function applyTemplate(template: LibraryItem) {
    setTitle((current) => current || template.title || "");
    setBody(template.body ?? "");
    setReferences(getKhutbahReferences(template));
  }

  function save() {
    const cleanedTitle = title.trim() || "Khutbah";

    setMessage(null);
    startTransition(async () => {
      const payload: CollectionItemInput = {
        body,
        id: item?.id,
        khutbahKind: kind,
        khutbahReferences: references,
        tags,
        title: cleanedTitle,
        type: "khutbah",
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
        setMessage(result.message ?? "Could not save khutbah.");
        return;
      }

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
      router.push(`/app/library/khutbahs/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <div className="grid gap-3">
          <ClearableInput
            label="Title"
            onChange={setTitle}
            placeholder="Jumu'ah reminder"
            value={title}
          />
          <label>
            <span className="text-xs font-bold uppercase tracking-wide text-palm">Type</span>
            <select
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
              onChange={(event) => setKind(event.target.value)}
              value={kind}
            >
              <option value="draft">Draft</option>
              <option value="template">Template</option>
              <option value="piece">Preset piece</option>
            </select>
          </label>
          <TagSelector existingTags={existingTags} onChange={setTags} value={tags} />
        </div>
      </section>

      {!item && templates.length ? (
        <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
          <h2 className="text-sm font-extrabold text-ink">Templates</h2>
          <div className="mt-3 grid gap-2">
            {templates.map((template) => (
              <button
                className="rounded-2xl border border-line bg-mist px-3 py-3 text-left text-sm font-extrabold text-ink"
                key={template.id}
                onClick={() => applyTemplate(template)}
                type="button"
              >
                {template.title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <div className="flex flex-wrap gap-2">
          {pieces.length ? (
            <select
              className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none"
              defaultValue=""
              onChange={(event) => {
                const piece = pieces.find((candidate) => candidate.id === event.target.value);
                if (piece?.body) {
                  insertText(piece.body, {
                    id: createLocalId(),
                    kind: "preset",
                    label: piece.title ?? "Preset piece",
                  });
                  event.target.value = "";
                }
              }}
            >
              <option value="">Insert preset</option>
              {pieces.map((piece) => (
                <option key={piece.id} value={piece.id}>
                  {piece.title}
                </option>
              ))}
            </select>
          ) : null}
          <button
            className="flex h-11 items-center gap-2 rounded-2xl bg-palm px-3 text-sm font-extrabold text-paper"
            onClick={() => setIsAyahSheetOpen(true)}
            type="button"
          >
            <BookOpen aria-hidden className="size-4" />
            Ayah
          </button>
          <button
            className="flex h-11 items-center gap-2 rounded-2xl bg-palm px-3 text-sm font-extrabold text-paper"
            onClick={() => setIsHadithSheetOpen(true)}
            type="button"
          >
            <ScrollText aria-hidden className="size-4" />
            Hadith
          </button>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Khutbah body</span>
          <textarea
            className="min-h-[52vh] w-full resize-y rounded-[1.35rem] border border-line bg-mist px-4 py-4 text-base leading-8 text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the khutbah here..."
            ref={textareaRef}
            value={body}
          />
        </label>
      </section>

      {references.length ? (
        <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
          <h2 className="text-sm font-extrabold text-ink">Attached references</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {references.map((reference) => (
              <button
                className="rounded-full bg-mist px-3 py-2 text-xs font-bold text-ink/60"
                key={reference.id}
                onClick={() =>
                  setReferences((current) =>
                    current.filter((candidate) => candidate.id !== reference.id),
                  )
                }
                type="button"
              >
                {buildReferenceLabel(reference)} x
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      ) : null}

      <button
        className="h-12 w-full rounded-2xl bg-palm text-sm font-extrabold text-paper shadow-soft disabled:opacity-60"
        disabled={isPending}
        onClick={save}
        type="button"
      >
        Save
      </button>

      {isAyahSheetOpen ? (
        <AyahInsertSheet
          onClose={() => setIsAyahSheetOpen(false)}
          onInsert={(text, reference) => {
            insertText(text, reference);
            setIsAyahSheetOpen(false);
          }}
          surahs={surahs}
        />
      ) : null}
      {isHadithSheetOpen ? (
        <HadithInsertSheet
          hadiths={hadiths}
          onClose={() => setIsHadithSheetOpen(false)}
          onInsert={(text, reference) => {
            insertText(text, reference);
            setIsHadithSheetOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function ClearableInput({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange(value: string): void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="relative block">
      <span className="text-xs font-bold uppercase tracking-wide text-palm">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 pr-10 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {value ? (
        <button
          aria-label={`Clear ${label}`}
          className="absolute right-3 top-9 flex size-6 items-center justify-center rounded-full bg-ink/10 text-ink/45"
          onClick={() => onChange("")}
          type="button"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </label>
  );
}

function TagSelector({
  existingTags = [],
  onChange,
  value,
}: {
  existingTags?: string[];
  onChange(tags: string[]): void;
  value: string[];
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draftTag, setDraftTag] = useState("");
  const options = useMemo(
    () => Array.from(new Set([...existingTags, ...value])).filter(Boolean).sort(),
    [existingTags, value],
  );

  function addTag() {
    const cleaned = draftTag.trim();

    if (!cleaned) return;

    onChange(cleanTags([...value, cleaned]));
    setDraftTag("");
    setIsAdding(false);
  }

  return (
    <div>
      <span className="text-xs font-bold uppercase tracking-wide text-palm">Tags</span>
      <div className="mt-2 rounded-2xl border border-line bg-mist p-2">
        {options.length ? (
          <div className="flex flex-wrap gap-2">
            {options.map((tag) => {
              const selected = value.includes(tag);

              return (
                <button
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-extrabold",
                    selected ? "bg-palm text-paper" : "bg-paper text-ink/60 ring-1 ring-line",
                  )}
                  key={tag}
                  onClick={() =>
                    onChange(
                      selected ? value.filter((current) => current !== tag) : [...value, tag],
                    )
                  }
                  type="button"
                >
                  {tag}
                </button>
              );
            })}
          </div>
        ) : null}
        {isAdding ? (
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <input
              className="h-10 rounded-xl border border-line bg-paper px-3 text-sm font-semibold text-ink outline-none"
              onChange={(event) => setDraftTag(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag();
                }
              }}
              placeholder="New tag"
              value={draftTag}
            />
            <button
              className="h-10 rounded-xl bg-palm px-3 text-xs font-extrabold text-paper"
              onClick={addTag}
              type="button"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            className="mt-2 h-10 w-full rounded-xl border border-dashed border-palm/25 bg-paper text-xs font-extrabold text-palm"
            onClick={() => setIsAdding(true)}
            type="button"
          >
            Add new tag
          </button>
        )}
      </div>
    </div>
  );
}

function AyahInsertSheet({
  onClose,
  onInsert,
  surahs,
}: {
  onClose(): void;
  onInsert(text: string, reference: KhutbahReferenceInput): void;
  surahs: Surah[];
}) {
  const [surahNumber, setSurahNumber] = useState(surahs[0]?.number ?? 1);
  const [verses, setVerses] = useState<VerseSummary[]>([]);
  const [startAyah, setStartAyah] = useState(1);
  const [endAyah, setEndAyah] = useState(1);
  const selectedSurah = surahs.find((surah) => surah.number === surahNumber);

  const loadVerses = useCallback(async (nextSurahNumber: number) => {
    setSurahNumber(nextSurahNumber);
    setStartAyah(1);
    setEndAyah(1);
    const response = await fetch(`/api/quran/surah/${nextSurahNumber}/verses?v=1`, {
      cache: "force-cache",
    });
    const payload = (await response.json()) as { verses?: VerseSummary[] };
    setVerses(payload.verses ?? []);
  }, []);

  useEffect(() => {
    void loadVerses(surahNumber);
  }, [loadVerses, surahNumber]);

  const selectedVerses = verses.filter(
    (verse) => verse.ayahNumber >= startAyah && verse.ayahNumber <= endAyah,
  );

  function insert() {
    const reference =
      startAyah === endAyah
        ? `${selectedSurah?.transliteratedName ?? `Surah ${surahNumber}`} ${surahNumber}:${startAyah}`
        : `${selectedSurah?.transliteratedName ?? `Surah ${surahNumber}`} ${surahNumber}:${startAyah}-${endAyah}`;
    const arabic = selectedVerses.map((verse) => verse.text).join(" ");
    const text = `${arabic}\n[${reference}]`;

    onInsert(text, {
      id: createLocalId(),
      kind: "ayah",
      label: reference,
      reference,
    });
  }

  return (
    <Sheet onClose={onClose} title="Insert ayah">
      <div className="grid gap-3">
        <select
          className="h-12 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink"
          onChange={(event) => void loadVerses(Number(event.target.value))}
          value={surahNumber}
        >
          {surahs.map((surah) => (
            <option key={surah.number} value={surah.number}>
              {surah.number}. {surah.transliteratedName}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-12 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink"
            onChange={(event) => {
              const next = Number(event.target.value);
              setStartAyah(next);
              setEndAyah((current) => Math.max(current, next));
            }}
            value={startAyah}
          >
            {verses.map((verse) => (
              <option key={verse.verseKey} value={verse.ayahNumber}>
                Start {verse.ayahNumber}
              </option>
            ))}
          </select>
          <select
            className="h-12 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink"
            onChange={(event) => setEndAyah(Number(event.target.value))}
            value={endAyah}
          >
            {verses
              .filter((verse) => verse.ayahNumber >= startAyah)
              .map((verse) => (
                <option key={verse.verseKey} value={verse.ayahNumber}>
                  End {verse.ayahNumber}
                </option>
              ))}
          </select>
        </div>
        <div className="rounded-[1.35rem] border border-line bg-paper p-4">
          <p className="text-right text-xl font-semibold leading-[2.2] text-ink" dir="rtl" lang="ar">
            {selectedVerses.map((verse) => verse.text).join(" ")}
          </p>
        </div>
        <button
          className="h-12 rounded-2xl bg-palm text-sm font-extrabold text-paper"
          disabled={!selectedVerses.length}
          onClick={insert}
          type="button"
        >
          Insert
        </button>
      </div>
    </Sheet>
  );
}

function HadithInsertSheet({
  hadiths,
  onClose,
  onInsert,
}: {
  hadiths: LibraryItem[];
  onClose(): void;
  onInsert(text: string, reference: KhutbahReferenceInput): void;
}) {
  const [mode, setMode] = useState<"arabic" | "both" | "english">("both");

  function insert(hadith: LibraryItem) {
    const arabic = getStringMeta(hadith, "arabicText");
    const translation = getStringMeta(hadith, "translation");
    const reference = getStringMeta(hadith, "reference") || hadith.title || "Hadith";
    const parts = [
      (mode === "arabic" || mode === "both") && arabic ? arabic : "",
      (mode === "english" || mode === "both") && translation ? translation : "",
      `[${reference}]`,
    ].filter(Boolean);

    onInsert(parts.join("\n"), {
      id: createLocalId(),
      kind: "hadith",
      label: hadith.title ?? "Hadith",
      reference,
    });
  }

  return (
    <Sheet onClose={onClose} title="Insert hadith">
      <div className="grid gap-3">
        <select
          className="h-12 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink"
          onChange={(event) => setMode(event.target.value as "arabic" | "both" | "english")}
          value={mode}
        >
          <option value="both">Arabic and English</option>
          <option value="arabic">Arabic only</option>
          <option value="english">English only</option>
        </select>
        {hadiths.length ? (
          <div className="grid gap-2">
            {hadiths.map((hadith) => (
              <button
                className="rounded-2xl border border-line bg-paper p-3 text-left"
                key={hadith.id}
                onClick={() => insert(hadith)}
                type="button"
              >
                <p className="text-sm font-extrabold text-ink">{hadith.title}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-palm">
                  {getStringMeta(hadith, "reference") || "Hadith"}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-line bg-paper p-4 text-sm font-semibold text-ink/55">
            No saved hadiths yet.
          </p>
        )}
      </div>
    </Sheet>
  );
}

function Sheet({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose(): void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/35 px-3 py-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden rounded-[1.7rem] bg-mist shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-3">
          <button className="text-sm font-extrabold text-palm" onClick={onClose} type="button">
            Close
          </button>
          <h2 className="text-sm font-extrabold text-ink">{title}</h2>
          <span className="w-10" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

export function KhutbahKindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-full bg-palm/10 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-palm">
      {kindLabels[kind] ?? kind}
    </span>
  );
}
