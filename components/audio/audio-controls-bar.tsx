"use client";

import { Pause, Play, SkipForward, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";
import { type ReciterId } from "@/lib/audio/reciters";

const repeatOptions = [1, 2, 3, 5, 10];

export function AudioControlsBar() {
  const audio = useAudioPlayer();
  const shouldShow = audio.currentVerseKey || audio.error;

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[4.8rem] z-30 px-3">
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-paper/95 p-2 shadow-soft backdrop-blur">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-ink">
              {audio.currentLabel ?? "Audio"}
            </p>
            {audio.error ? (
              <p className="text-xs font-semibold text-red-700">{audio.error}</p>
            ) : (
              <p className="text-xs font-semibold text-ink/45">
                {audio.isPlaying ? "Playing" : "Paused"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              aria-label={audio.isPlaying ? "Pause audio" : "Resume audio"}
              className="size-9 rounded-full p-0"
              onClick={audio.isPlaying ? audio.pause : audio.resume}
              variant="secondary"
            >
              {audio.isPlaying ? (
                <Pause aria-hidden className="size-4" />
              ) : (
                <Play aria-hidden className="size-4" />
              )}
            </Button>
            <Button
              aria-label="Next ayah"
              className="size-9 rounded-full p-0"
              onClick={audio.next}
              variant="secondary"
            >
              <SkipForward aria-hidden className="size-4" />
            </Button>
            <Button
              aria-label="Stop audio"
              className="size-9 rounded-full p-0"
              onClick={audio.stop}
              variant="secondary"
            >
              <Square aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/45">
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
          <label className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/45">
            Ayah
            <select
              className="mt-1 h-9 w-full rounded-xl border border-line bg-mist px-2 text-xs font-semibold text-ink"
              onChange={(event) => audio.setVerseRepeatCount(Number(event.target.value))}
              value={audio.verseRepeatCount}
            >
              {repeatOptions.map((count) => (
                <option key={count} value={count}>
                  x{count}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.68rem] font-bold uppercase tracking-wide text-ink/45">
            Range
            <select
              className="mt-1 h-9 w-full rounded-xl border border-line bg-mist px-2 text-xs font-semibold text-ink"
              onChange={(event) => audio.setRangeRepeatCount(Number(event.target.value))}
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
      </div>
    </div>
  );
}
