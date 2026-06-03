import { type LibraryItem, type TextMarkerInput, type TextMarkerType } from "@/lib/library/types";

export function getStringMeta(item: LibraryItem, key: string) {
  const value = item.metadata?.[key];

  return typeof value === "string" ? value : "";
}

export function getBooleanMeta(item: LibraryItem, key: string) {
  return item.metadata?.[key] === true;
}

export function getTags(item: LibraryItem) {
  const tags = item.metadata?.tags;

  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
}

export function getCollectionHref(type: "dua" | "hadith") {
  return type === "dua" ? "/app/library/duas" : "/app/library/hadiths";
}

function isTextMarkerType(value: unknown): value is TextMarkerType {
  return value === "sanad" || value === "matn" || value === "quote";
}

export function getTextMarkers(item: LibraryItem, key: string): TextMarkerInput[] {
  const markers = item.metadata?.[key];

  if (!Array.isArray(markers)) return [];

  return markers.filter((marker): marker is TextMarkerInput => {
    if (!marker || typeof marker !== "object") return false;
    const candidate = marker as Record<string, unknown>;

    return (
      typeof candidate.id === "string" &&
      Number.isInteger(candidate.startWordPosition) &&
      Number.isInteger(candidate.endWordPosition) &&
      isTextMarkerType(candidate.type)
    );
  });
}
