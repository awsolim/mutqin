import {
  type DuaEntryInput,
  type KhutbahReferenceInput,
  type LibraryItem,
  type CollectionItemKind,
  type TextMarkerInput,
  type TextMarkerType,
} from "@/lib/library/types";

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

export function getCollectionHref(type: CollectionItemKind) {
  if (type === "dua") return "/app/library/duas";
  if (type === "hadith") return "/app/library/hadiths";

  return "/app/library/khutbahs";
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

export function getDuaEntries(item: LibraryItem): DuaEntryInput[] {
  const entries = item.metadata?.duaEntries;

  if (!Array.isArray(entries)) return [];

  return entries.filter((entry): entry is DuaEntryInput => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as Record<string, unknown>;

    return typeof candidate.id === "string" && typeof candidate.arabicText === "string";
  });
}

export function getKhutbahReferences(item: LibraryItem): KhutbahReferenceInput[] {
  const references = item.metadata?.khutbahReferences;

  if (!Array.isArray(references)) return [];

  return references.filter((reference): reference is KhutbahReferenceInput => {
    if (!reference || typeof reference !== "object") return false;
    const candidate = reference as Record<string, unknown>;

    return (
      typeof candidate.id === "string" &&
      typeof candidate.label === "string" &&
      (candidate.kind === "ayah" ||
        candidate.kind === "hadith" ||
        candidate.kind === "preset")
    );
  });
}
