"use client";

import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { useAudioPlayer } from "@/lib/audio/use-audio-player";

type AudioPlaybackDockProps = {
  isVisible: boolean;
};

export function AudioPlaybackDock({ isVisible }: AudioPlaybackDockProps) {
  const audio = useAudioPlayer();

  if (!audio.currentVerseKey) {
    return null;
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] transition-transform duration-200 ${
        isVisible ? "translate-y-0" : "translate-y-[calc(100%+1rem)]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[44rem] items-center gap-3 rounded-[1.4rem] border border-line bg-paper/95 px-3 py-2 shadow-[0_-18px_60px_rgba(31,39,33,0.18)] backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {audio.currentLabel ?? `Ayah ${audio.currentVerseKey}`}
          </p>
          <p className="text-xs font-semibold text-ink/50">
            {audio.isPlaying ? "Playing" : "Paused"}
          </p>
        </div>
        <DockButton
          label={audio.isPlaying ? "Pause" : "Resume"}
          onClick={audio.isPlaying ? audio.pause : audio.resume}
        >
          {audio.isPlaying ? (
            <Pause aria-hidden className="size-5" />
          ) : (
            <Play aria-hidden className="size-5" />
          )}
        </DockButton>
        <DockButton label="Restart" onClick={audio.restart}>
          <RotateCcw aria-hidden className="size-5" />
        </DockButton>
        <DockButton label="End" onClick={audio.stop}>
          <Square aria-hidden className="size-5" />
        </DockButton>
      </div>
    </div>
  );
}

function DockButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-full text-[0.65rem] font-bold text-ink/60 transition hover:text-palm focus:outline-none focus:ring-2 focus:ring-palm/20"
      onClick={onClick}
      type="button"
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
