import { type SimilarVerseHighlightType } from "./types";

export type SimilarVerseHighlightLayer = {
  color: string;
  id: SimilarVerseHighlightType;
  name: string;
};

export const similarVerseHighlightLayerStorageKey = "mutqin:similar-highlight-layers";

export const defaultSimilarVerseHighlightLayers: SimilarVerseHighlightLayer[] = [
  { id: "universal_shared", name: "Shared by all", color: "#dcecdf" },
  { id: "partial_shared", name: "Shared by most", color: "#dbeaf7" },
  { id: "outlier", name: "Outlier", color: "#f5d6d0" },
  { id: "identity_marker", name: "Key difference", color: "#f3d7b2" },
];

export function normalizeSimilarVerseHighlightLayers(
  value: unknown,
): SimilarVerseHighlightLayer[] {
  if (!Array.isArray(value)) {
    return defaultSimilarVerseHighlightLayers;
  }

  const layers = value
    .map((layer) => {
      if (!layer || typeof layer !== "object") {
        return null;
      }

      const candidate = layer as Partial<SimilarVerseHighlightLayer>;
      const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
      const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
      const color = typeof candidate.color === "string" ? candidate.color.trim() : "";

      if (!id || !name || !/^#[0-9a-f]{6}$/i.test(color)) {
        return null;
      }

      return { color, id, name };
    })
    .filter((layer): layer is SimilarVerseHighlightLayer => Boolean(layer));

  return layers.length ? layers : defaultSimilarVerseHighlightLayers;
}

export function getSimilarVerseHighlightLayer(
  layers: SimilarVerseHighlightLayer[],
  type: SimilarVerseHighlightType,
) {
  return (
    layers.find((layer) => layer.id === type) ??
    defaultSimilarVerseHighlightLayers.find((layer) => layer.id === type) ?? {
      color: "#ece7d5",
      id: type,
      name: String(type).replaceAll("_", " "),
    }
  );
}
