import { getAyahByVerseKey } from "@/lib/quran/utils";
import {
  type CreateSimilarVerseSetInput,
  type SimilarVerseDraftItem,
  type SimilarVerseHighlightType,
} from "./types";

type DemoRecord = {
  familyTitle: string;
  highlights: CreateSimilarVerseSetInput["highlights"];
  items: SimilarVerseDraftItem[];
  note: string;
  title: string;
};

type PhraseHighlight = {
  label?: string;
  phrase: string;
  type: SimilarVerseHighlightType;
  verseKey: string;
};

type DemoHighlight = CreateSimilarVerseSetInput["highlights"][number];

const dabVerseKeys = ["3:11", "8:52", "8:54"];
const yasirVerseKeys = ["22:46", "30:9", "35:11", "35:44", "40:21", "40:82", "47:10"];

export function getSimilarVersesDemoRecord(demo: string | undefined): DemoRecord | null {
  if (demo === "dab") {
    return buildDemoRecord({
      familyTitle: "كَدَأْبِ آلِ فِرْعَوْنَ",
      title: "كَدَأْبِ آلِ فِرْعَوْنَ",
      note:
        "All three begin with كَدَأْبِ آلِ فِرْعَوْنَ. 3:11 says كَذَّبُوا بِآيَاتِنَا and has the shorter ending. 8:52 is the only one with كَفَرُوا بِآيَاتِ اللَّهِ and adds قَوِيٌّ. 8:54 says كَذَّبُوا بِآيَاتِ رَبِّهِمْ and expands into destruction and drowning.",
      phraseHighlights: [
        ...dabVerseKeys.map((verseKey) => ({
          phrase: "كَدَأْبِ آلِ فِرْعَوْنَ وَالَّذِينَ مِن قَبْلِهِمْ",
          type: "universal_shared" as const,
          verseKey,
        })),
        { phrase: "كَذَّبُوا بِآيَاتِنَا", type: "identity_marker", verseKey: "3:11" },
        { phrase: "كَفَرُوا بِآيَاتِ اللَّهِ", type: "identity_marker", verseKey: "8:52" },
        { phrase: "كَذَّبُوا بِآيَاتِ رَبِّهِمْ", type: "identity_marker", verseKey: "8:54" },
        { phrase: "فَأَخَذَهُمُ اللَّهُ بِذُنُوبِهِمْ", type: "partial_shared", verseKey: "3:11" },
        { phrase: "فَأَخَذَهُمُ اللَّهُ بِذُنُوبِهِمْ", type: "partial_shared", verseKey: "8:52" },
        { phrase: "فَأَهْلَكْنَاهُم بِذُنُوبِهِمْ", type: "outlier", verseKey: "8:54" },
        { phrase: "وَاللَّهُ شَدِيدُ الْعِقَابِ", type: "ending_family", verseKey: "3:11" },
        { phrase: "إِنَّ اللَّهَ قَوِيٌّ شَدِيدُ الْعِقَابِ", type: "ending_family", verseKey: "8:52" },
        {
          phrase: "وَأَغْرَقْنَا آلَ فِرْعَوْنَ وَكُلٌّ كَانُوا ظَالِمِينَ",
          type: "ending_outlier",
          verseKey: "8:54",
        },
      ],
      verseKeys: dabVerseKeys,
    });
  }

  if (demo === "yasir") {
    return buildDemoRecord({
      familyTitle: "يسير / يسيرا",
      title: "يسير / يسيرا family",
      note:
        "This is a broad يسيروا في الأرض / يسير family. It should work as an encompassing family log, showing repeated travel/reflection phrasing and helping identify which surah/ending each instance belongs to. This record is intentionally a family-level example, not just a tight 2-verse comparison.",
      phraseHighlights: yasirVerseKeys.flatMap((verseKey) => [
        {
          phrase: "أَفَلَمْ يَسِيرُوا فِي الْأَرْضِ",
          type: "partial_shared" as const,
          verseKey,
        },
      ]),
      verseKeys: yasirVerseKeys,
    });
  }

  return null;
}

function buildDemoRecord(input: {
  familyTitle: string;
  note: string;
  phraseHighlights: PhraseHighlight[];
  title: string;
  verseKeys: string[];
}): DemoRecord {
  const items = input.verseKeys
    .map((verseKey) => getAyahByVerseKey(verseKey))
    .filter((item): item is SimilarVerseDraftItem => Boolean(item));
  const highlights = input.phraseHighlights.reduce<DemoHighlight[]>((currentHighlights, highlight) => {
      const item = items.find((currentItem) => currentItem.verseKey === highlight.verseKey);
      const range = item ? findPhraseRange(item, highlight.phrase) : null;

      if (!range) {
        return currentHighlights;
      }

      currentHighlights.push({
        endWordPosition: range.endWordPosition,
        label: highlight.label ?? null,
        note: null,
        startWordPosition: range.startWordPosition,
        type: highlight.type,
        verseKey: highlight.verseKey,
      });

      return currentHighlights;
    }, []);

  return {
    familyTitle: input.familyTitle,
    highlights,
    items,
    note: input.note,
    title: input.title,
  };
}

function normalizeArabic(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[ۚۖۗۙۛۜۘـ]/g, "")
    .replace(/[أإآٱا]/g, "ا")
    .replace(/[ءٔ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findPhraseRange(item: SimilarVerseDraftItem, phrase: string) {
  const phraseWords = normalizeArabic(phrase).split(" ");
  const words = item.words.map((word) => normalizeArabic(word.text));

  for (let index = 0; index <= words.length - phraseWords.length; index += 1) {
    const candidate = words.slice(index, index + phraseWords.length);

    if (candidate.every((word, wordIndex) => word === phraseWords[wordIndex])) {
      return {
        endWordPosition: item.words[index + phraseWords.length - 1].wordPosition,
        startWordPosition: item.words[index].wordPosition,
      };
    }
  }

  return null;
}
