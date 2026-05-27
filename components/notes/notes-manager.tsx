"use client";

import { useMemo, useState, useTransition } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import { createNote, deleteNote, updateNote } from "@/lib/notes/actions";
import { formatNoteReference } from "@/lib/notes/format";
import { type Note, type NoteType } from "@/lib/notes/types";
import { type Surah } from "@/lib/quran/types";
import { Button } from "@/components/ui/button";

type NotesManagerProps = {
  initialSurahNumber?: number;
  notes: Note[];
  surahs: Surah[];
};

const noteTypes: Array<NoteType | "all"> = ["all", "ayah", "range", "surah"];

export function NotesManager({ initialSurahNumber, notes, surahs }: NotesManagerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<NoteType | "all">("all");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newSurahNumber, setNewSurahNumber] = useState(initialSurahNumber ?? surahs[0]?.number ?? 1);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const surahsByNumber = useMemo(
    () => new Map(surahs.map((surah) => [surah.number, surah])),
    [surahs],
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return notes.filter((note) => {
      const surah = surahsByNumber.get(note.surahNumber);
      const reference = formatNoteReference(note, surah?.transliteratedName);
      const matchesType = filter === "all" || note.type === filter;
      const matchesQuery =
        !normalizedQuery ||
        [note.title, note.body, reference, surah?.arabicName, surah?.englishName]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesType && matchesQuery;
    });
  }, [filter, notes, query, surahsByNumber]);

  function resetForm() {
    setEditingNote(null);
    setTitle("");
    setBody("");
  }

  function saveSurahNote() {
    startTransition(async () => {
      const result = await createNote({
        type: "surah",
        surahNumber: newSurahNumber,
        title,
        body,
      });
      setMessage(result.message);
      if (result.ok) {
        resetForm();
      }
    });
  }

  function saveEdit() {
    if (!editingNote) {
      return;
    }

    startTransition(async () => {
      const result = await updateNote(editingNote.id, { title, body });
      setMessage(result.message);
      if (result.ok) {
        resetForm();
      }
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-paper p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Plus aria-hidden className="size-5 text-palm" />
          <h2 className="text-base font-bold text-ink">
            {editingNote ? "Edit note" : "New surah note"}
          </h2>
        </div>
        {!editingNote ? (
          <label className="mb-2 block text-xs font-bold uppercase text-ink/45">
            Surah
            <select
              className="mt-1 h-11 w-full rounded-xl border border-line bg-mist px-3 text-sm font-semibold text-ink"
              onChange={(event) => setNewSurahNumber(Number(event.target.value))}
              value={newSurahNumber}
            >
              {surahs.map((surah) => (
                <option key={surah.number} value={surah.number}>
                  {surah.number}. {surah.transliteratedName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <input
          className="mb-2 h-11 w-full rounded-xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title optional"
          value={title}
        />
        <textarea
          className="min-h-28 w-full resize-none rounded-xl border border-line bg-mist px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a note"
          value={body}
        />
        <div className="mt-3 flex gap-2">
          <Button
            className="flex-1"
            disabled={isPending || !body.trim()}
            onClick={editingNote ? saveEdit : saveSurahNote}
          >
            {isPending ? "Saving..." : editingNote ? "Save changes" : "Save note"}
          </Button>
          {editingNote ? (
            <Button onClick={resetForm} variant="secondary">
              Cancel
            </Button>
          ) : null}
        </div>
        {message ? <p className="mt-2 text-sm font-semibold text-palm">{message}</p> : null}
      </section>

      <section className="space-y-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-sage"
          />
          <input
            aria-label="Search notes"
            className="min-h-12 w-full rounded-2xl border border-line bg-paper py-3 pl-11 pr-4 text-base text-ink shadow-soft outline-none transition placeholder:text-ink/40 focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes or references"
            value={query}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {noteTypes.map((type) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                filter === type ? "bg-palm text-white" : "bg-paper text-ink/60"
              }`}
              key={type}
              onClick={() => setFilter(type)}
              type="button"
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {filteredNotes.length > 0 ? (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const surah = surahsByNumber.get(note.surahNumber);
            const reference = formatNoteReference(note, surah?.transliteratedName);

            return (
              <article
                className="rounded-2xl border border-line bg-paper p-4 shadow-soft"
                key={note.id}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase text-palm">{reference}</p>
                    <h3 className="mt-1 text-base font-bold text-ink">
                      {note.title || "Untitled note"}
                    </h3>
                  </div>
                  <span className="rounded-full bg-mist px-2 py-1 text-xs font-bold capitalize text-ink/55">
                    {note.type}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-ink/75">
                  {note.body}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    className="min-h-10 px-3 text-xs"
                    onClick={() => {
                      setEditingNote(note);
                      setTitle(note.title ?? "");
                      setBody(note.body);
                    }}
                    variant="secondary"
                  >
                    <Edit3 aria-hidden className="size-4" />
                    Edit
                  </Button>
                  <Button
                    className="min-h-10 px-3 text-xs"
                    onClick={() => {
                      if (!window.confirm("Delete this note?")) {
                        return;
                      }

                      startTransition(async () => {
                        const result = await deleteNote(note.id);
                        setMessage(result.message);
                      });
                    }}
                    variant="danger"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-paper px-4 py-8 text-center shadow-soft">
          <p className="text-sm font-semibold text-ink">No notes found</p>
          <p className="mt-1 text-sm text-ink/60">
            Save an ayah note from the mushaf, or create a surah note here.
          </p>
        </div>
      )}
    </div>
  );
}
