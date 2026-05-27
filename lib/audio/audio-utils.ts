import { getReciter, type ReciterId } from "./reciters";

export type ParsedVerseKey = {
  surahNumber: number;
  ayahNumber: number;
};

export function parseVerseKey(verseKey: string): ParsedVerseKey {
  const [surahNumber, ayahNumber] = verseKey.split(":").map(Number);

  if (!Number.isInteger(surahNumber) || !Number.isInteger(ayahNumber)) {
    throw new Error(`Invalid verse key: ${verseKey}`);
  }

  return { surahNumber, ayahNumber };
}

export function verseKeyToPaddedAyahNumber(verseKey: string) {
  const { surahNumber, ayahNumber } = parseVerseKey(verseKey);

  return `${String(surahNumber).padStart(3, "0")}${String(ayahNumber).padStart(3, "0")}`;
}

export function getAudioUrl(reciterId: ReciterId, verseKey: string) {
  const reciter = getReciter(reciterId);

  return `${reciter.audioBaseUrl}/${verseKeyToPaddedAyahNumber(verseKey)}.mp3`;
}

export function compareVerseKeys(a: string, b: string) {
  const verseA = parseVerseKey(a);
  const verseB = parseVerseKey(b);

  if (verseA.surahNumber !== verseB.surahNumber) {
    return verseA.surahNumber - verseB.surahNumber;
  }

  return verseA.ayahNumber - verseB.ayahNumber;
}
