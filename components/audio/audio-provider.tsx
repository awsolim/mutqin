"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAudioUrl } from "@/lib/audio/audio-utils";
import { reciters, type ReciterId } from "@/lib/audio/reciters";

export type AudioQueueItem = {
  verseKey: string;
  label: string;
};

type AudioPlayerContextValue = {
  currentReciter: ReciterId;
  currentQueue: AudioQueueItem[];
  currentVerseKey: string | null;
  currentLabel: string | null;
  error: string;
  isPlaying: boolean;
  rangeRepeatCount: number;
  reciters: typeof reciters;
  verseRepeatCount: number;
  next: () => void;
  pause: () => void;
  playQueue: (queue: AudioQueueItem[], options?: { rangeRepeatCount?: number }) => void;
  playVerse: (item: AudioQueueItem) => void;
  resume: () => void;
  restart: () => void;
  setCurrentReciter: (reciterId: ReciterId) => void;
  setRangeRepeatCount: (count: number) => void;
  setVerseRepeatCount: (count: number) => void;
  stop: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const defaultReciter: ReciterId = "alafasy";

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioPreloadRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<AudioQueueItem[]>([]);
  const queueIndexRef = useRef(0);
  const verseLoopRef = useRef(1);
  const rangeLoopRef = useRef(1);
  const [currentReciter, setCurrentReciter] = useState<ReciterId>(defaultReciter);
  const [currentQueue, setCurrentQueue] = useState<AudioQueueItem[]>([]);
  const [currentVerseKey, setCurrentVerseKey] = useState<string | null>(null);
  const [currentLabel, setCurrentLabel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [verseRepeatCount, setVerseRepeatCount] = useState(1);
  const [rangeRepeatCount, setRangeRepeatCount] = useState(1);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  const preloadUpcomingItem = useCallback(
    (index: number) => {
      const upcomingItem = queueRef.current[index + 1];

      if (!upcomingItem) {
        nextAudioPreloadRef.current = null;
        return;
      }

      const nextAudio = new Audio(getAudioUrl(currentReciter, upcomingItem.verseKey));
      nextAudio.preload = "auto";
      nextAudio.load();
      nextAudioPreloadRef.current = nextAudio;
    },
    [currentReciter],
  );

  const loadCurrentItem = useCallback(async () => {
    const audio = audioRef.current;
    const item = queueRef.current[queueIndexRef.current];

    if (!audio || !item) {
      setIsPlaying(false);
      setCurrentVerseKey(null);
      setCurrentLabel(null);
      return;
    }

    setError("");
    setCurrentVerseKey(item.verseKey);
    setCurrentLabel(item.label);
    audio.src = getAudioUrl(currentReciter, item.verseKey);
    preloadUpcomingItem(queueIndexRef.current);

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      setError("Audio unavailable for this reciter/ayah.");
    }
  }, [currentReciter, preloadUpcomingItem]);

  const stop = useCallback(() => {
    const audio = audioRef.current;

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }

    queueRef.current = [];
    queueIndexRef.current = 0;
    verseLoopRef.current = 1;
    rangeLoopRef.current = 1;
    setCurrentQueue([]);
    setCurrentVerseKey(null);
    setCurrentLabel(null);
    setIsPlaying(false);
  }, []);

  const next = useCallback(() => {
    if (!queueRef.current.length) {
      stop();
      return;
    }

    verseLoopRef.current = 1;

    if (queueIndexRef.current < queueRef.current.length - 1) {
      queueIndexRef.current += 1;
      void loadCurrentItem();
      return;
    }

    if (rangeLoopRef.current < rangeRepeatCount) {
      rangeLoopRef.current += 1;
      queueIndexRef.current = 0;
      void loadCurrentItem();
      return;
    }

    stop();
  }, [loadCurrentItem, rangeRepeatCount, stop]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleEnded = () => {
      if (verseLoopRef.current < verseRepeatCount) {
        verseLoopRef.current += 1;
        audio.currentTime = 0;
        void audio.play().catch(() => {
          setIsPlaying(false);
          setError("Audio unavailable for this reciter/ayah.");
        });
        return;
      }

      next();
    };

    const handleError = () => {
      setIsPlaying(false);
      setError("Audio unavailable for this reciter/ayah.");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [next, verseRepeatCount]);

  const playQueue = useCallback(
    (queue: AudioQueueItem[], options?: { rangeRepeatCount?: number }) => {
      if (!queue.length) {
        return;
      }

      queueRef.current = queue;
      queueIndexRef.current = 0;
      verseLoopRef.current = 1;
      rangeLoopRef.current = 1;
      setCurrentQueue(queue);

      if (options?.rangeRepeatCount) {
        setRangeRepeatCount(options.rangeRepeatCount);
      }

      void loadCurrentItem();
    },
    [loadCurrentItem],
  );

  const playVerse = useCallback(
    (item: AudioQueueItem) => {
      playQueue([item], { rangeRepeatCount: 1 });
    },
    [playQueue],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
      setIsPlaying(true);
    } catch {
      setError("Audio unavailable for this reciter/ayah.");
    }
  }, []);

  const restart = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio || !currentVerseKey) {
      return;
    }

    try {
      audio.currentTime = 0;
      await audio.play();
      setIsPlaying(true);
    } catch {
      setError("Audio unavailable for this reciter/ayah.");
    }
  }, [currentVerseKey]);

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      currentReciter,
      currentQueue,
      currentVerseKey,
      currentLabel,
      error,
      isPlaying,
      next,
      pause,
      playQueue,
      playVerse,
      rangeRepeatCount,
      reciters,
      resume,
      restart,
      setCurrentReciter,
      setRangeRepeatCount,
      setVerseRepeatCount,
      stop,
      verseRepeatCount,
    }),
    [
      currentLabel,
      currentQueue,
      currentReciter,
      currentVerseKey,
      error,
      isPlaying,
      next,
      pause,
      playQueue,
      playVerse,
      rangeRepeatCount,
      resume,
      restart,
      stop,
      verseRepeatCount,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioProvider.");
  }

  return context;
}
