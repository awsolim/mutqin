"use client";

import {
  BookMarked,
  Headphones,
  NotebookPen,
  Play,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createNote } from "@/lib/notes/actions";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";
import { type ReciterId } from "@/lib/audio/reciters";
import { type SelectedAyah } from "@/lib/quran/types";

type AyahActionBarProps = {
  selectedAyah: SelectedAyah | null;
  isVisible: boolean;
  canPlayRange: boolean;
  onClose: () => void;
  onPlayRange: () => void;
  onSetRangeEnd: (verseKey: string) => void;
  onStartPlayback: () => void;
  onNotify: (message: string) => void;
  rangeLabel: string | null;
  rangeOptions: Array<{ verseKey: string; label: string }>;
  selectedRangeEndVerseKey: string | null;
};

const actions = [
  { label: "Note", icon: NotebookPen },
  { label: "I'rab", icon: BookMarked },
];
const repeatOptions = [1, 2, 3, 5, 10];

export function AyahActionBar({
  canPlayRange,
  isVisible,
  onClose,
  onPlayRange,
  onSetRangeEnd,
  onStartPlayback,
  onNotify,
  rangeLabel,
  rangeOptions,
  selectedAyah,
  selectedRangeEndVerseKey,
}: AyahActionBarProps) {
  const [message, setMessage] = useState("");
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const audio = useAudioPlayer();
  const verseKey = selectedAyah?.verseKey;

  useEffect(() => {
    setIsAudioOpen(false);
    setIsNoteOpen(false);
    setMessage("");
  }, [verseKey]);

  if (!selectedAyah) {
    return null;
  }
  const ayah = selectedAyah;

  function playSingleAyah() {
    setIsNoteOpen(false);
    audio.playVerse({
      verseKey: ayah.verseKey,
      label: `Ayah ${ayah.verseKey}`,
    });
    setIsAudioOpen(false);
    onStartPlayback();
  }

  function playCurrentRange() {
    setIsNoteOpen(false);
    onPlayRange();
    setIsAudioOpen(false);
    onStartPlayback();
  }

  async function saveNote() {
    setIsSavingNote(true);
    const endVerseKey = selectedRangeEndVerseKey;
    const endAyahNumber = endVerseKey ? Number(endVerseKey.split(":")[1]) : null;
    const isRange = Boolean(endAyahNumber && endAyahNumber !== ayah.ayahNumber);
    const result = await createNote({
      type: isRange ? "range" : "ayah",
      surahNumber: ayah.surahNumber,
      ayahStart: ayah.ayahNumber,
      ayahEnd: isRange ? endAyahNumber : ayah.ayahNumber,
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
      setIsNoteOpen(false);
      onNotify(result.message);
      onClose();
      window.setTimeout(() => window.scrollTo(0, 0), 0);
      return;
    }

    setMessage(result.message);
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-transform duration-200 ${
        isVisible ? "translate-y-0" : "translate-y-[calc(100%+1rem)]"
      }`}
      onFocusCapture={() => window.setTimeout(() => window.scrollTo(0, 0), 0)}
    >
      <div className="mx-auto w-full max-w-[44rem] overflow-hidden rounded-[1.4rem] border border-line bg-paper/95 shadow-[0_-18px_60px_rgba(31,39,33,0.18)] backdrop-blur">
        {isAudioOpen ? (
          <div className="border-b border-line/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">
                  Audio repetition
                </p>
                <p className="truncate text-xs font-semibold text-ink/50">
                  {rangeLabel ?? `Ayah ${ayah.verseKey}`}
                </p>
              </div>
              <button
                aria-label="Stop audio"
                className="flex size-10 items-center justify-center rounded-full bg-mist text-ink transition hover:text-palm focus:outline-none focus:ring-2 focus:ring-palm/25"
                onClick={audio.stop}
                type="button"
              >
                <Square aria-hidden className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[0.68rem] font-bold uppercase text-ink/45">
                Reciter
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-line bg-mist px-2 text-xs font-semibold text-ink"
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
              <label className="text-[0.68rem] font-bold uppercase text-ink/45">
                Ayah
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-line bg-mist px-2 text-xs font-semibold text-ink"
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
              <label className="text-[0.68rem] font-bold uppercase text-ink/45">
                Range
                <select
                  className="mt-1 h-9 w-full rounded-xl border border-line bg-mist px-2 text-xs font-semibold text-ink"
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
            <label className="mt-3 block text-[0.68rem] font-bold uppercase text-ink/45">
              Stop ayah
              <select
                className="mt-1 h-10 w-full rounded-xl border border-line bg-mist px-3 text-sm font-semibold text-ink"
                onChange={(event) => onSetRangeEnd(event.target.value)}
                value={selectedRangeEndVerseKey ?? ayah.verseKey}
              >
                {rangeOptions.map((option) => (
                  <option key={option.verseKey} value={option.verseKey}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-mist px-3 text-sm font-bold text-palm transition hover:bg-palm/10 focus:outline-none focus:ring-2 focus:ring-palm/25"
                onClick={audio.stop}
                type="button"
              >
                <Square aria-hidden className="size-4" />
                Stop
              </button>
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-palm px-3 text-sm font-bold text-white transition hover:bg-[#244b3d] focus:outline-none focus:ring-2 focus:ring-palm/25"
                onClick={canPlayRange ? playCurrentRange : playSingleAyah}
                type="button"
              >
                <Play aria-hidden className="size-4" />
                Play
              </button>
            </div>
          </div>
        ) : null}
        {isNoteOpen ? (
          <div className="border-b border-line/70 p-3">
            <div className="mb-3">
              <p className="text-sm font-bold text-ink">Add note</p>
              <p className="text-xs font-semibold text-ink/50">
                {rangeLabel ?? `Ayah ${ayah.verseKey}`}
              </p>
            </div>
            <input
              className="mb-2 h-10 w-full rounded-xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
              onChange={(event) => setNoteTitle(event.target.value)}
              placeholder="Title optional"
              value={noteTitle}
            />
            <textarea
              className="min-h-28 w-full resize-none rounded-xl border border-line bg-mist px-3 py-2 text-sm leading-6 text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/20"
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Write your hifz note"
              value={noteBody}
            />
            <button
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-palm px-3 text-sm font-bold text-white transition hover:bg-[#244b3d] focus:outline-none focus:ring-2 focus:ring-palm/25 disabled:opacity-60"
              disabled={isSavingNote || !noteBody.trim()}
              onClick={saveNote}
              type="button"
            >
              {isSavingNote ? "Saving..." : "Save note"}
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-1 px-3 py-2">
          <div className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-full border border-palm/25 bg-palm/8 text-sm font-bold text-palm">
            {ayah.ayahNumber}
          </div>
          <div className="grid flex-1 grid-cols-3 gap-1">
            <ActionIcon
              icon={Headphones}
              label="Play"
              onClick={() => {
                setIsNoteOpen(false);
                setIsAudioOpen((isOpen) => !isOpen);
              }}
            />
            {actions.map((action) => (
              <ActionIcon
                icon={action.icon}
                key={action.label}
                label={action.label}
                onClick={() => {
                  if (action.label === "Note") {
                    setIsAudioOpen(false);
                    setIsNoteOpen((isOpen) => !isOpen);
                    return;
                  }

                  setMessage(`${action.label} is coming soon.`);
                }}
              />
            ))}
          </div>
          <button
            aria-label="Close ayah actions"
            className="ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink/50 transition hover:bg-mist hover:text-ink focus:outline-none focus:ring-2 focus:ring-palm/25"
            onClick={() => {
              setMessage("");
              setIsAudioOpen(false);
              setIsNoteOpen(false);
              onClose();
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
      className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-full text-[0.68rem] font-bold text-ink/55 transition hover:text-palm focus:outline-none focus:ring-2 focus:ring-palm/20"
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
