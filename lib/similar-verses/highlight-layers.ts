import { type SimilarVerseHighlightType } from "./types";

export type SimilarVerseHighlightLayer = {
  color: string;
  id: SimilarVerseHighlightType;
  name: string;
};

export const defaultSimilarVerseHighlightLayers: SimilarVerseHighlightLayer[] = [
  { id: "identity_marker", name: "Key Difference 1", color: "#e3d8f4" },
  { id: "ending_outlier", name: "Key Difference 2", color: "#dcecdf" },
  { id: "memory_clue", name: "Key Difference 3", color: "#f0dfb7" },
  { id: "partial_shared", name: "Shared by Most", color: "#dbeaf7" },
  { id: "outlier", name: "Outlier", color: "#f5d6d0" },
  { id: "ending_family", name: "Extra", color: "#ecd3ae" },
];

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
