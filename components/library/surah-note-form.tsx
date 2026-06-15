"use client";

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
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedSurah = surahs.find((surah) => surah.number === surahNumber) ?? surahs[0];

  function save() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/library/surah-notes", {
        body: JSON.stringify({ surahNumber, title }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!result.ok) {
        setMessage(result.message ?? "Could not save surah tag.");
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
          <span className="text-xs font-bold uppercase tracking-wide text-palm">Tag</span>
          <input
            className="mt-2 h-12 w-full rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none placeholder:text-ink/35 focus:border-palm/40 focus:ring-2 focus:ring-palm/15"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ali Imran is structurally minimal"
            value={title}
          />
        </label>
      </section>

      {message ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      ) : null}

      <button
        className="h-12 w-full rounded-2xl bg-palm text-sm font-extrabold text-paper shadow-soft transition hover:bg-palm/90 disabled:opacity-60"
        disabled={isPending || !title.trim()}
        onClick={save}
        type="button"
      >
        Save
      </button>
    </div>
  );
}
