"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type Surah } from "@/lib/quran/types";

type SurahNoteFormProps = {
  initialSurahNumber: number;
  surahs: Surah[];
};

export function SurahNoteForm({ initialSurahNumber, surahs }: SurahNoteFormProps) {
  const router = useRouter();
  const [surahNumber, setSurahNumber] = useState(initialSurahNumber);
  const [title, setTitle] = useState("");
  const [bullets, setBullets] = useState([""]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedSurah = surahs.find((surah) => surah.number === surahNumber) ?? surahs[0];

  function updateBullet(index: number, value: string) {
    setBullets((current) =>
      current.map((bullet, bulletIndex) => (bulletIndex === index ? value : bullet)),
    );
  }

  function removeBullet(index: number) {
    setBullets((current) =>
      current.length === 1 ? [""] : current.filter((_, bulletIndex) => bulletIndex !== index),
    );
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/library/surah-notes", {
        body: JSON.stringify({ bullets, surahNumber, title }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!result.ok) {
        setMessage(result.message ?? "Could not save surah notes.");
        return;
      }

      router.push(`/app/library/surah-notes?surah=${surahNumber}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-palm">Surah</span>
          <select
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            onChange={(event) => setSurahNumber(Number(event.target.value))}
            value={surahNumber}
          >
            {surahs.map((surah) => (
              <option key={surah.number} value={surah.number}>
                {surah.number}. {surah.transliteratedName}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 rounded-2xl bg-palm/5 px-4 py-3 text-right" dir="rtl" lang="ar">
          <p className="text-xl font-bold leading-9 text-ink">{selectedSurah?.arabicName}</p>
        </div>
      </section>

      <section className="rounded-[1.45rem] border border-line bg-paper p-4 shadow-soft">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-palm">Title</span>
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Record title"
            value={title}
          />
        </label>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-palm">Notes</p>
            <button
              className="flex size-9 items-center justify-center rounded-full bg-palm text-paper shadow-soft transition hover:bg-palm/90"
              onClick={() => setBullets((current) => [...current, ""])}
              type="button"
            >
              <Plus aria-hidden className="size-4" />
              <span className="sr-only">Add bullet</span>
            </button>
          </div>
          {bullets.map((bullet, index) => (
            <div className="grid grid-cols-[1fr_auto] gap-2" key={index}>
              <input
                className="h-12 rounded-2xl border border-line bg-mist px-3 text-sm font-semibold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
                onChange={(event) => updateBullet(index, event.target.value)}
                placeholder="Add a bullet point"
                value={bullet}
              />
              <button
                className="flex size-12 items-center justify-center rounded-2xl bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600"
                onClick={() => removeBullet(index)}
                type="button"
              >
                <Trash2 aria-hidden className="size-4" />
                <span className="sr-only">Remove bullet</span>
              </button>
            </div>
          ))}
        </div>
      </section>

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
        Save
      </button>
    </div>
  );
}
